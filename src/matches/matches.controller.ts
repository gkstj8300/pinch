import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { ApplyDto } from './dto/apply.dto';

@Controller('matches')
export class MatchesController {
  constructor(private readonly matches: MatchesService) {}

  @Post('apply')
  @HttpCode(201)
  async apply(@Body() dto: ApplyDto) {
    const match = await this.matches.apply(BigInt(dto.jobId), BigInt(dto.workerId));
    return {
      id: match.id.toString(),
      jobId: match.jobId.toString(),
      workerId: match.workerId.toString(),
      status: match.status,
      matchedAt: match.matchedAt,
    };
  }
}
