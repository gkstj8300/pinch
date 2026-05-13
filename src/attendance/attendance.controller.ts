import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Match } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { CurrentUser } from '@/auth/current-user.decorator';
import type { CurrentUserContext } from '@/auth/types';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  /**
   * 사업주가 매칭 화면에서 호출 → 동적 QR 토큰. 30초마다 재호출 권장.
   */
  @Get(':id/qr')
  @HttpCode(200)
  async getQr(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserContext,
  ) {
    return this.attendance.generateQr(user.id, BigInt(id));
  }

  /**
   * 워커가 QR 스캔 직후 호출 → 체크인 확정.
   */
  @Post(':id/check-in')
  @HttpCode(200)
  async checkIn(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: CheckInDto,
  ) {
    const match = await this.attendance.checkIn(user.id, BigInt(id), dto);
    return AttendanceController.serialize(match);
  }

  /**
   * 워커 퇴근 — 시각 기록. 정산은 사업주 approve 후.
   */
  @Post(':id/check-out')
  @HttpCode(200)
  async checkOut(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserContext,
  ) {
    const match = await this.attendance.checkOut(user.id, BigInt(id));
    return AttendanceController.serialize(match);
  }

  private static serialize(match: Match) {
    return {
      id: match.id.toString(),
      jobId: match.jobId.toString(),
      workerId: match.workerId.toString(),
      status: match.status,
      checkInAt: match.checkInAt,
      checkOutAt: match.checkOutAt,
      distanceM: match.checkInDistance,
    };
  }
}
