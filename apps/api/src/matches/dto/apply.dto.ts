import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  jobId!: number;
}
