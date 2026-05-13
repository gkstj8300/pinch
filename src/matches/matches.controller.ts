import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { ApplyDto } from './dto/apply.dto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { CurrentUser } from '@/auth/current-user.decorator';
import type { CurrentUserContext } from '@/auth/types';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post('apply')
  @HttpCode(201)
  async apply(@CurrentUser() user: CurrentUserContext, @Body() dto: ApplyDto) {
    const match = await this.matches.apply(BigInt(dto.jobId), user.id);
    return {
      id: match.id.toString(),
      jobId: match.jobId.toString(),
      workerId: match.workerId.toString(),
      status: match.status,
      matchedAt: match.matchedAt,
    };
  }
}
