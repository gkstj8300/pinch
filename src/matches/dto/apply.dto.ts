import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobId!: number;

  // PoC 단계: 인증 미구현이므로 body로 workerId 받음
  // Slice 3에서 JWT payload로 대체 예정
  @Type(() => Number)
  @IsInt()
  @Min(1)
  workerId!: number;
}
