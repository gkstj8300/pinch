import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { haversineMeters } from '@/libs/geo/haversine';
import { QrService } from './qr.service';
import type { CheckInDto } from './dto/check-in.dto';

export type AttendanceFailureReason =
  | 'MATCH_NOT_FOUND'
  | 'NOT_YOUR_MATCH'
  | 'NOT_YOUR_JOB'
  | `INVALID_STATE:${MatchStatus}`
  | 'TOO_EARLY'
  | 'TOO_LATE'
  | 'OUT_OF_RANGE';

const CHECKIN_WINDOW_MIN = 60;

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly qr: QrService,
  ) {}

  /**
   * 사업주가 자기 화면에 띄울 동적 QR 발급.
   * 권한: 해당 매칭이 속한 공고의 사업주(clientId) 만.
   */
  async generateQr(clientId: bigint, matchId: bigint) {
    const match = await this.prisma.match.findFirst({
      where: { id: matchId, deletedAt: null },
      include: { job: { select: { clientId: true } } },
    });
    if (!match) throw new NotFoundException('MATCH_NOT_FOUND');
    if (match.job.clientId !== clientId) throw new ForbiddenException('NOT_YOUR_JOB');

    const { qrToken, expiresIn } = this.qr.generate(matchId);
    return {
      qrToken,
      expiresIn,
      refreshAt: new Date(Date.now() + expiresIn * 1000),
    };
  }

  /**
   * 워커 체크인. QR + GPS + 시간 윈도우 모두 통과 시 status=CHECKED_IN.
   *
   * 검증 순서 (fast-fail):
   *   1) QR 형식·HMAC·시간 윈도우 (qr.service)
   *   2) QR 의 matchId 가 URL :id 와 일치
   *   3) Match 조회 + soft-delete 확인
   *   4) 본인 매칭인가 (workerId)
   *   5) 상태가 MATCHED 인가
   *   6) 시작 시각 ±60분 이내인가
   *   7) GPS 거리가 공고 reception 반경 이내인가
   */
  async checkIn(workerId: bigint, matchId: bigint, dto: CheckInDto) {
    const tokenMatchId = this.qr.verify(dto.qrToken);
    if (tokenMatchId === null) {
      throw new UnauthorizedException('INVALID_QR');
    }
    if (tokenMatchId !== matchId) {
      throw new UnauthorizedException('QR_MISMATCH');
    }

    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findFirst({
        where: { id: matchId, deletedAt: null },
        include: {
          job: {
            select: {
              latitude: true,
              longitude: true,
              startAt: true,
              checkInRadiusM: true,
            },
          },
        },
      });
      if (!match) throw new NotFoundException('MATCH_NOT_FOUND');
      if (match.workerId !== workerId) {
        throw new ForbiddenException('NOT_YOUR_MATCH');
      }
      if (match.status !== MatchStatus.MATCHED) {
        throw new ConflictException(`INVALID_STATE:${match.status}`);
      }

      // 시간 윈도우 검증
      const now = new Date();
      const diffMin = (now.getTime() - match.job.startAt.getTime()) / 60_000;
      if (diffMin < -CHECKIN_WINDOW_MIN) throw new ConflictException('TOO_EARLY');
      if (diffMin > CHECKIN_WINDOW_MIN) throw new ConflictException('TOO_LATE');

      // GPS 거리 검증
      const distance = haversineMeters(
        { lat: dto.lat, lng: dto.lng },
        {
          lat: Number(match.job.latitude),
          lng: Number(match.job.longitude),
        },
      );
      if (distance > match.job.checkInRadiusM) {
        throw new UnprocessableEntityException({
          code: 'OUT_OF_RANGE',
          distance,
          allowed: match.job.checkInRadiusM,
        });
      }

      return tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.CHECKED_IN,
          checkInAt: now,
          checkInLat: dto.lat,
          checkInLng: dto.lng,
          checkInDistance: distance,
        },
      });
    });
  }

  /**
   * 워커 체크아웃. status=CHECKED_OUT.
   *
   * 정산은 별도 단계(사업주 approve) — 이 단계에서는 시각만 기록.
   */
  async checkOut(workerId: bigint, matchId: bigint) {
    return this.prisma.$transaction(async (tx) => {
      const match = await tx.match.findFirst({
        where: { id: matchId, deletedAt: null },
      });
      if (!match) throw new NotFoundException('MATCH_NOT_FOUND');
      if (match.workerId !== workerId) {
        throw new ForbiddenException('NOT_YOUR_MATCH');
      }
      if (match.status !== MatchStatus.CHECKED_IN) {
        throw new ConflictException(`INVALID_STATE:${match.status}`);
      }

      return tx.match.update({
        where: { id: matchId },
        data: {
          status: MatchStatus.CHECKED_OUT,
          checkOutAt: new Date(),
        },
      });
    });
  }
}
