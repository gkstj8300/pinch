import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, Prisma, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  WITHHOLDING_STRATEGY,
  type WithholdingStrategy,
} from './withholding.token';

export interface SettlementResult {
  matchId: string;
  status: MatchStatus;
  workedMinutes: number;
  grossAmount: number;
  withholdingTax: number;
  netAmount: number;
  taxBreakdown: { incomeTax: number; localTax: number };
  walletBalanceAfter: number;
  creditedAt: Date;
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WITHHOLDING_STRATEGY) private readonly strategy: WithholdingStrategy,
  ) {}

  /**
   * 사업주가 근무를 승인 → 워커 지갑에 정산 적립.
   *
   * 트랜잭션 내 처리:
   *   1) 매칭 + 공고 조회, 권한·상태 검증
   *   2) 워크 시간·총액·원천세 계산
   *   3) 조건부 UPDATE 로 status CHECKED_OUT → COMPLETED 원자적 전이
   *      (race 차단: 동시에 두 번 approve 호출 시 두 번째 affected=0)
   *   4) Wallet 보장 (upsert)
   *   5) Transaction 1건 기록 (gross + withhold + net + balance audit)
   *      idempotencyKey = settle:<matchId> 로 중복 차단 (보조)
   *   6) Wallet 잔액·누적 통계 갱신
   *
   * 권한: 해당 공고의 사업주(clientId) 만 호출 가능.
   */
  async approve(clientId: bigint, matchId: bigint): Promise<SettlementResult> {
    return this.prisma.$transaction(async (tx) => {
      // 1) 매칭 + 공고 조회
      const match = await tx.match.findFirst({
        where: { id: matchId, deletedAt: null },
        include: {
          job: { select: { clientId: true, hourlyWage: true } },
        },
      });
      if (!match) throw new NotFoundException('MATCH_NOT_FOUND');
      if (match.job.clientId !== clientId) {
        throw new ForbiddenException('NOT_APPROVER');
      }
      if (match.status !== MatchStatus.CHECKED_OUT) {
        throw new ConflictException(`INVALID_STATE:${match.status}`);
      }
      if (!match.checkInAt || !match.checkOutAt) {
        throw new ConflictException('MISSING_TIMESTAMPS');
      }

      // 2) 계산
      const workedMinutes = Math.max(
        0,
        Math.floor((match.checkOutAt.getTime() - match.checkInAt.getTime()) / 60_000),
      );
      const gross = Math.floor((match.job.hourlyWage * workedMinutes) / 60);
      const result = this.strategy.calculate(gross);
      const now = new Date();

      // 3) 조건부 UPDATE — 동시 approve race 차단
      const updated = await tx.$executeRaw(Prisma.sql`
        UPDATE matches
        SET status = 'COMPLETED',
            completed_at = ${now},
            worked_minutes = ${workedMinutes},
            gross_amount = ${gross},
            withholding_tax = ${result.withholdingTax},
            net_amount = ${result.netAmount},
            updated_at = now()
        WHERE id = ${matchId}
          AND status = 'CHECKED_OUT'
          AND deleted_at IS NULL
      `);
      if (updated === 0) {
        throw new ConflictException('CONCURRENT_SETTLEMENT_ATTEMPT');
      }

      // 4) Wallet 보장 (없으면 생성)
      const wallet = await tx.wallet.upsert({
        where: { userId: match.workerId },
        create: { userId: match.workerId },
        update: {},
      });

      // 5) Transaction 기록 — idempotencyKey 로 중복 차단(보조)
      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + result.netAmount;

      try {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            matchId,
            type: TransactionType.EARNING,
            status: TransactionStatus.COMPLETED,
            grossAmount: gross,
            withholdingTax: result.withholdingTax,
            netAmount: result.netAmount,
            balanceBefore,
            balanceAfter,
            idempotencyKey: `settle:${matchId}`,
            processedAt: now,
            description: `근무 정산 (${workedMinutes}분, 시급 ${match.job.hourlyWage}원)`,
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('ALREADY_SETTLED');
        }
        throw e;
      }

      // 6) Wallet 잔액 갱신
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: balanceAfter,
          totalEarned: { increment: gross },
          totalWithheld: { increment: result.withholdingTax },
        },
      });

      return {
        matchId: matchId.toString(),
        status: MatchStatus.COMPLETED,
        workedMinutes,
        grossAmount: gross,
        withholdingTax: result.withholdingTax,
        netAmount: result.netAmount,
        taxBreakdown: result.taxBreakdown,
        walletBalanceAfter: updatedWallet.balance,
        creditedAt: now,
      };
    });
  }
}
