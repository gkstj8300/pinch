import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { SearchJobsQueryDto } from './dto/search-jobs.dto';

interface JobSearchRow {
  id: bigint;
  title: string;
  category: string;
  address: string;
  latitude: string;       // numeric → text 캐스트
  longitude: string;
  start_at: Date;
  end_at: Date;
  hourly_wage: number;
  estimated_minutes: number;
  recruit_count: number;
  confirmed_count: number;
  check_in_radius_m: number;
  status: string;
  distance_m: number;
}

interface CursorPayload {
  d: number;     // distance_m
  i: string;     // last job id (BigInt 문자열)
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 위치 기반 공고 탐색 — PostGIS ST_DWithin + KNN 정렬.
   *
   * 정렬 키: (거리 asc, id asc) — 거리 동률 시 id 로 안정 정렬.
   * 페이지네이션: cursor = (마지막 row 의 distance, id) base64url 인코딩.
   *   다음 페이지는 (distance, id) 튜플이 cursor 보다 strictly 큰 row 만.
   */
  async search(params: SearchJobsQueryDto) {
    const lat = Number(params.lat);
    const lng = Number(params.lng);
    const radius = params.radiusM ?? 3000;
    const limit = params.limit ?? 20;

    const cursor = decodeCursor(params.cursor);

    // 위치 기준점 SQL 조각 (반복 사용)
    const point = Prisma.sql`ST_MakePoint(${lng}, ${lat})::geography`;

    // WHERE 조건 동적 조립
    const conds: Prisma.Sql[] = [
      Prisma.sql`j.deleted_at IS NULL`,
      Prisma.sql`j.status = 'OPEN'`,
      Prisma.sql`j.start_at > now()`,
      Prisma.sql`ST_DWithin(j.location, ${point}, ${radius})`,
    ];

    if (cursor) {
      // SELECT 의 distance_m 은 ::int 캐스트 → WHERE 의 비교도 동일하게 int.
      // 그러지 않으면 4790.37 > 4790 (cursor) 로 false-pass 되어 페이지 중복.
      conds.push(
        Prisma.sql`(
          (ST_Distance(j.location, ${point}))::int > ${cursor.d}
          OR ((ST_Distance(j.location, ${point}))::int = ${cursor.d} AND j.id > ${BigInt(cursor.i)})
        )`,
      );
    }
    if (params.category) {
      conds.push(Prisma.sql`j.category = ${params.category}`);
    }
    if (params.minWage !== undefined) {
      conds.push(Prisma.sql`j.hourly_wage >= ${params.minWage}`);
    }
    if (params.startAfter) {
      conds.push(Prisma.sql`j.start_at >= ${new Date(params.startAfter)}`);
    }

    const whereClause = Prisma.join(conds, ' AND ');

    const rows = await this.prisma.$queryRaw<JobSearchRow[]>(Prisma.sql`
      SELECT
        j.id,
        j.title,
        j.category,
        j.address,
        j.latitude::text AS latitude,
        j.longitude::text AS longitude,
        j.start_at,
        j.end_at,
        j.hourly_wage,
        j.estimated_minutes,
        j.recruit_count,
        j.confirmed_count,
        j.check_in_radius_m,
        j.status::text AS status,
        ST_Distance(j.location, ${point})::int AS distance_m
      FROM jobs j
      WHERE ${whereClause}
      ORDER BY j.location <-> ${point}, j.id
      LIMIT ${limit + 1}
    `);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor({
            d: items[items.length - 1].distance_m,
            i: items[items.length - 1].id.toString(),
          })
        : null;

    return {
      items: items.map(toApiShape),
      nextCursor,
    };
  }

  /**
   * 공고 상세 — 사업주 정보(이름·평점·리뷰 수) 포함.
   */
  async findOne(id: bigint) {
    const job = await this.prisma.job.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            ratingAvg: true,
            totalReviews: true,
          },
        },
      },
    });
    if (!job) throw new NotFoundException('JOB_NOT_FOUND');

    return {
      id: job.id.toString(),
      title: job.title,
      description: job.description,
      category: job.category,
      address: job.address,
      latitude: Number(job.latitude),
      longitude: Number(job.longitude),
      startAt: job.startAt,
      endAt: job.endAt,
      hourlyWage: job.hourlyWage,
      estimatedMinutes: job.estimatedMinutes,
      estimatedPay: Math.floor((job.hourlyWage * job.estimatedMinutes) / 60),
      recruitCount: job.recruitCount,
      confirmedCount: job.confirmedCount,
      checkInRadiusM: job.checkInRadiusM,
      status: job.status,
      client: {
        id: job.client.id.toString(),
        name: job.client.name,
        ratingAvg: Number(job.client.ratingAvg),
        totalReviews: job.client.totalReviews,
      },
    };
  }
}

function toApiShape(row: JobSearchRow) {
  return {
    id: row.id.toString(),
    title: row.title,
    category: row.category,
    address: row.address,
    distanceM: row.distance_m,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    startAt: row.start_at,
    endAt: row.end_at,
    hourlyWage: row.hourly_wage,
    estimatedMinutes: row.estimated_minutes,
    estimatedPay: Math.floor((row.hourly_wage * row.estimated_minutes) / 60),
    recruitCount: row.recruit_count,
    confirmedCount: row.confirmed_count,
    checkInRadiusM: row.check_in_radius_m,
    status: row.status,
  };
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeCursor(raw?: string | null): CursorPayload | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(Buffer.from(raw, 'base64url').toString());
    if (typeof obj?.d !== 'number' || typeof obj?.i !== 'string') return null;
    return obj as CursorPayload;
  } catch {
    return null;
  }
}
