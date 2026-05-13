import {
  Body,
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { CurrentUser } from '@/auth/current-user.decorator';
import type { CurrentUserContext } from '@/auth/types';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly review: ReviewService) {}

  /**
   * 매칭에 대한 양방향 평가 — 워커는 사업주를, 사업주는 워커를 평가.
   * target 은 writer 의 반대 측으로 자동 결정.
   */
  @Post(':id/review')
  @HttpCode(201)
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.review.submit(user.id, BigInt(id), dto);
  }
}
