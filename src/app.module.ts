import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MatchesModule } from './matches/matches.module';
import { AttendanceModule } from './attendance/attendance.module';
import { SettlementModule } from './settlement/settlement.module';
import { ReviewModule } from './review/review.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    JobsModule,
    MatchesModule,
    AttendanceModule,
    SettlementModule,
    ReviewModule,
  ],
})
export class AppModule {}
