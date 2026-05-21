import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobsService, toJobApiShape } from './jobs.service';
import { SearchJobsQueryDto } from './dto/search-jobs.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { MyJobsQueryDto } from './dto/my-jobs-query.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { CurrentUser } from '@/auth/current-user.decorator';
import type { CurrentUserContext } from '@/auth/types';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  /**
   * 워커 위치 기준 반경 내 공고 검색.
   * 정렬: 거리 가까운 순. cursor 페이지네이션.
   */
  @Get('search')
  async search(@Query() query: SearchJobsQueryDto) {
    return this.jobs.search(query);
  }

  /**
   * 사업주 본인 공고 목록 — created_at desc, offset 페이지네이션.
   * role 가드: CLIENT 만 허용 (워커가 사업주 공고 목록 조회 차단).
   */
  @Get('my')
  async findMy(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: MyJobsQueryDto,
  ) {
    if (user.role !== 'CLIENT') {
      throw new ForbiddenException('CLIENT_ONLY');
    }
    const result = await this.jobs.findMyJobs(user.id, query);
    return {
      items: result.items.map(toJobApiShape),
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.findOne(BigInt(id));
  }

  /**
   * 사업주 공고 등록. ownership(client_id) 는 JWT sub 로 자동.
   * role 가드: CLIENT 만 허용. body 의 clientId 는 무시 (DTO 에 없음).
   */
  @Post()
  @HttpCode(201)
  async create(@CurrentUser() user: CurrentUserContext, @Body() dto: CreateJobDto) {
    if (user.role !== 'CLIENT') {
      throw new ForbiddenException('CLIENT_ONLY');
    }
    const job = await this.jobs.createForClient(user.id, dto);
    return toJobApiShape(job);
  }
}
