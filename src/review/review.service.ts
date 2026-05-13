import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { SubmitReviewDto } from './dto/submit-review.dto';

export interface ReviewResult {
  id: string;
  matchId: string;
  writerId: string;
  targetId: string;
  score: number;
  comment: string | null;
  createdAt: Date;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 매칭에 대한 양방향 평가 — 워커↔사업주.
   *
   * 검증:
   *   - 매칭 존재 + soft-delete 확인
   *   - JWT user 가 매칭 참여자(워커 또는 사업주). 그 외 → 403
   *   - target 은 writer 의 반대 측 자동 결정 (worker→client, client→worker)
   *   - 매칭 상태 = COMPLETED (정산 완료된 매칭만 평가 가능)
   *   - score 1~5 (DB CHECK 로 강제, DTO 검증으로 미리 차단)
   *   - 자기 평가 금지 (DB CHECK 로 강제 — writer != target)
   *   - 매칭당 작성자 1회 (@@unique([matchId, writerId]) — P2002 차단)
   *
   * 통계 갱신: target 의 rating_avg / total_reviews 를 atomic SQL UPDATE 로
   *   가중 평균 재계산 — 동시 리뷰의 race 차단.
   */
  async submit(
    writerId: bigint,
    matchId: bigint,
    dto: SubmitReviewDto,
  ): Promise<ReviewResult> {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findFirst({
        where: { id: matchId, deletedAt: null },
        include: { job: { select: { clientId: true } } },
      });
      if (!match) throw new NotFoundException('MATCH_NOT_FOUND');

      // 참여자 판별 + target 결정
      let targetId: bigint;
      if (match.workerId === writerId) {
        targetId = match.job.clientId;
      } else if (match.job.clientId === writerId) {
        targetId = match.workerId;
      } else {
        throw new ForbiddenException('NOT_PARTICIPANT');
      }

      if (match.status !== MatchStatus.COMPLETED) {
        throw new ConflictException(`INVALID_STATE:${match.status}`);
      }

      // 리뷰 작성 — unique([matchId, writerId]) 가 중복 차단
      let review;
      try {
        review = await tx.review.create({
          data: {
            matchId,
            writerId,
            targetId,
            score: dto.score,
            comment: dto.comment ?? null,
          },
        });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw new ConflictException('ALREADY_REVIEWED');
        }
        throw e;
      }

      // target 의 rating_avg / total_reviews 를 atomic 가중 평균 갱신.
      // 동시 리뷰의 race 는 PostgreSQL row-level lock 으로 직렬화됨.
      await tx.$executeRaw(Prisma.sql`
        UPDATE users
        SET
          rating_avg = ROUND(
            ((rating_avg * total_reviews) + ${dto.score})::numeric / (total_reviews + 1),
            2
          ),
          total_reviews = total_reviews + 1,
          updated_at = now()
        WHERE id = ${targetId}
      `);

      return {
        id: review.id.toString(),
        matchId: review.matchId.toString(),
        writerId: review.writerId.toString(),
        targetId: review.targetId.toString(),
        score: review.score,
        comment: review.comment,
        createdAt: review.createdAt,
      };
    });
  }
}
