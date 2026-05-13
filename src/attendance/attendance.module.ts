import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { QrService } from './qr.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, QrService],
  exports: [QrService],
})
export class AttendanceModule {}
