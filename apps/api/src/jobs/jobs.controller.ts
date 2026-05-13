import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { SearchJobsQueryDto } from './dto/search-jobs.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

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

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.jobs.findOne(BigInt(id));
  }
}
