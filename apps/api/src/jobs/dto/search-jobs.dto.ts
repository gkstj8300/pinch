import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchJobsQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  /** 반경(m). 기본 3000, 최대 20000. */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(20_000)
  radiusM?: number = 3000;

  /** 카테고리 정확 일치 */
  @IsOptional()
  @IsString()
  @Length(1, 40)
  category?: string;

  /** 시급 하한 (원) */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  minWage?: number;

  /** 시작 시각 하한 (ISO 8601). 기본 = now(+1초) */
  @IsOptional()
  @IsISO8601()
  startAfter?: string;

  /** 이전 응답의 nextCursor */
  @IsOptional()
  @IsString()
  cursor?: string;

  /** 페이지당 결과 수 — 1~50, 기본 20 */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
