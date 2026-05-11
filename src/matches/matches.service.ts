import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma, MatchStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type ApplyFailureReason =
  | 'JOB_NOT_FOUND'
  | 'JOB_CLOSED'
  | 'CAPACITY_FULL'
  | 'SCORE_TOO_LOW'
  | 'VERIFICATION_REQUIRED'
  | 'JOB_ALREADY_STARTED'
  | 'ALREADY_APPLIED'
  | 'UNKNOWN';

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 선착순 지원 → 즉시 확정.
   *
   * 동시성 차단 메커니즘:
   *   조건부 UPDATE 의 affected rows 로만 정원 차지 여부를 판단.
   *   SELECT-후-UPDATE 패턴은 race window 가 발생하므로 금지.
   */
  async apply(jobId: bigint, workerId: bigint) {
    // 워커 자격 사전 조회 (락 외부 — 빠른 실패)
    const worker = await this.prisma.user.findFirst({
      where: { id: workerId, deletedAt: null, role: 'WORKER' },
      select: { id: true, isVerified: true, pinchScore: true },
    });
    if (!worker) throw new ForbiddenException('WORKER_ONLY');

    return this.prisma.$transaction(
      async (tx) => {
        // 1) 조건부 UPDATE — 정원·자격·시간이 모두 충족된 공고만 +1
        //    affected rows == 1 이면 자리 확보 성공
        const affected = await tx.$executeRaw(Prisma.sql`
          UPDATE jobs
          SET confirmed_count = confirmed_count + 1,
              updated_at = now()
          WHERE id = ${jobId}
            AND deleted_at IS NULL
            AND status = 'OPEN'
            AND start_at > now()
            AND confirmed_count < recruit_count
            AND min_pinch_score <= ${worker.pinchScore}
            AND (require_verified = false OR ${worker.isVerified})
        `);

        if (affected === 0) {
          // 어떤 조건에서 떨어졌는지 진단
          const reason = await this.diagnoseFailure(tx, jobId, worker);
          throw new ConflictException(reason);
        }

        // 2) Match 생성 — @@unique([jobId, workerId])로 중복 지원 차단
        try {
          const match = await tx.match.create({
            data: {
              jobId,
              workerId,
              status: MatchStatus.MATCHED,
              matchedAt: new Date(),
            },
          });

          // 3) 정원 도달 시 자동 마감
          await tx.$executeRaw(Prisma.sql`
            UPDATE jobs
            SET status = 'CLOSED', updated_at = now()
            WHERE id = ${jobId}
              AND confirmed_count >= recruit_count
              AND status = 'OPEN'
          `);

          return match;
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
            // 중복 지원 — 위에서 +1 한 confirmed_count 는 트랜잭션 롤백으로 원복
            throw new ConflictException('ALREADY_APPLIED' satisfies ApplyFailureReason);
          }
          throw e;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  private async diagnoseFailure(
    tx: Prisma.TransactionClient,
    jobId: bigint,
    worker: { isVerified: boolean; pinchScore: number },
  ): Promise<ApplyFailureReason> {
    const job = await tx.job.findUnique({ where: { id: jobId } });
    if (!job || job.deletedAt) return 'JOB_NOT_FOUND';
    if (job.status !== 'OPEN') return 'JOB_CLOSED';
    if (job.confirmedCount >= job.recruitCount) return 'CAPACITY_FULL';
    if (job.minPinchScore > worker.pinchScore) return 'SCORE_TOO_LOW';
    if (job.requireVerified && !worker.isVerified) return 'VERIFICATION_REQUIRED';
    if (job.startAt <= new Date()) return 'JOB_ALREADY_STARTED';
    return 'UNKNOWN';
  }
}
