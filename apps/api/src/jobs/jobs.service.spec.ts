import { BadRequestException } from '@nestjs/common';
import { JobStatus, Prisma, UserRole, type Job } from '@prisma/client';
import { JobsService } from './jobs.service';
import type { PrismaService } from '@/prisma/prisma.service';

/**
 * JobsService 단위 테스트.
 *   - createForClient / findMyJobs 만 검증 (search/findOne 는 PostGIS·DB 의존)
 *   - PrismaService mock — job.create / findMany / count / $transaction
 *   - 시간 검증 + 자동 estimatedMinutes 계산 + ownership 자동
 */
describe('JobsService', () => {
  let service: JobsService;
  let prisma: jest.Mocked<PrismaService>;

  function buildJob(overrides: Partial<Job> = {}): Job {
    const now = new Date();
    return {
      id: 1n,
      clientId: 7n,
      title: 'Test job',
      description: 'desc',
      category: 'F&B',
      address: '서울 중구 세종대로 110',
      latitude: new Prisma.Decimal(37.56635),
      longitude: new Prisma.Decimal(126.97791),
      location: null,
      startAt: new Date(now.getTime() + 3_600_000),
      endAt: new Date(now.getTime() + 7_200_000),
      hourlyWage: 12000,
      estimatedMinutes: 60,
      recruitCount: 1,
      confirmedCount: 0,
      minPinchScore: 0,
      requireVerified: true,
      checkInRadiusM: 150,
      status: JobStatus.OPEN,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      ...overrides,
    } as unknown as Job;
  }

  beforeEach(() => {
    prisma = {
      job: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;
    service = new JobsService(prisma);
  });

  describe('createForClient', () => {
    const baseDto = {
      title: '카페 홀 서빙 (1시간)',
      description: '오후 피크 타임 1시간 서빙 도와주실 분 모집합니다.',
      category: 'F&B',
      address: '서울 중구 세종대로 110',
      latitude: 37.56635,
      longitude: 126.97791,
      hourlyWage: 12000,
      recruitCount: 1,
    };

    it('정상 등록 — estimatedMinutes 자동 계산 + clientId ownership', async () => {
      const start = new Date(Date.now() + 3_600_000);
      const end = new Date(start.getTime() + 5_400_000); // 90 min
      (prisma.job.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve(buildJob({
          clientId: data.clientId,
          startAt: data.startAt,
          endAt: data.endAt,
          estimatedMinutes: data.estimatedMinutes,
        })),
      );

      const result = await service.createForClient(7n, {
        ...baseDto,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });

      const created = (prisma.job.create as jest.Mock).mock.calls[0][0].data;
      expect(created.clientId).toBe(7n);
      expect(created.estimatedMinutes).toBe(90);
      expect(created.latitude).toBeInstanceOf(Prisma.Decimal);
      expect(result.estimatedMinutes).toBe(90);
    });

    it('startAt >= endAt 면 400 INVALID_TIME_RANGE', async () => {
      const t = new Date(Date.now() + 3_600_000).toISOString();
      await expect(
        service.createForClient(7n, { ...baseDto, startAt: t, endAt: t }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.job.create).not.toHaveBeenCalled();
    });

    it('startAt 이 과거면 400 START_IN_PAST', async () => {
      const past = new Date(Date.now() - 3_600_000).toISOString();
      const end = new Date(Date.now() + 3_600_000).toISOString();
      await expect(
        service.createForClient(7n, { ...baseDto, startAt: past, endAt: end }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.job.create).not.toHaveBeenCalled();
    });
  });

  describe('findMyJobs', () => {
    it('본인 공고 목록 + total 반환 (offset 페이지)', async () => {
      const jobs = [buildJob({ id: 11n }), buildJob({ id: 12n })];
      (prisma.$transaction as jest.Mock).mockResolvedValue([jobs, 42]);

      const result = await service.findMyJobs(7n, { page: 2, limit: 10 });

      expect(result).toEqual({ items: jobs, total: 42, page: 2, limit: 10 });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('default page=1, limit=20', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      const result = await service.findMyJobs(7n, {});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // role 가드는 controller 단의 인라인 if 로 처리 — service spec 범위 외.
  void UserRole;
});
