import {
  Controller,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { CurrentUser } from '@/auth/current-user.decorator';
import type { CurrentUserContext } from '@/auth/types';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class SettlementController {
  constructor(private readonly settlement: SettlementService) {}

  /**
   * 사업주가 근무 종료된 매칭을 승인 → 워커 지갑에 정산 적립.
   *
   * 전제 상태: match.status = CHECKED_OUT
   * 응답: SettlementResult (gross/원천세/실수령/지갑잔액)
   */
  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.settlement.approve(user.id, BigInt(id));
  }
}
