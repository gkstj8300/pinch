import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

/** 2026 KR 최저시급 — 매년 갱신 (정책 변경 시 별도 PR) */
const MINIMUM_WAGE_KRW = 10030;

/**
 * 사업주 공고 등록 DTO.
 *   - estimatedMinutes 는 백엔드가 startAt/endAt 차이로 자동 계산
 *   - latitude/longitude 는 카카오 로컬 API 결과를 클라이언트가 채워 보냄
 *   - hourlyWage 는 최저시급 하한 검증 (R5)
 */
export class CreateJobDto {
  @IsString()
  @Length(5, 120)
  title!: string;

  @IsString()
  @Length(10, 1000)
  description!: string;

  @IsString()
  @Length(1, 40)
  category!: string;

  @IsString()
  @Length(1, 255)
  address!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsInt()
  @Min(MINIMUM_WAGE_KRW)
  @Max(1_000_000)
  hourlyWage!: number;

  @IsInt()
  @Min(1)
  @Max(50)
  recruitCount!: number;
}
