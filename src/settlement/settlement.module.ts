import { Module } from '@nestjs/common';
import { SettlementController } from './settlement.controller';
import { SettlementService } from './settlement.service';
import { BusinessIncomeStrategy } from '@/libs/settlement/withholding';
import { WITHHOLDING_STRATEGY } from './withholding.token';

@Module({
  controllers: [SettlementController],
  providers: [
    SettlementService,
    {
      provide: WITHHOLDING_STRATEGY,
      // Slice 2: 사업소득 3.3%. Slice 3 또는 운영 정책 변경 시 DailyWorkerStrategy 로 교체.
      useClass: BusinessIncomeStrategy,
    },
  ],
})
export class SettlementModule {}
