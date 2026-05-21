/**
 * JobStatus — 백엔드 @prisma/JobStatus 와 1:1.
 */
export type JobStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'CLOSED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Job API 응답 — 백엔드 toJobApiShape() 출력과 정합.
 *   - description 은 상세 조회에만 포함 (findOne)
 *   - client 정보는 상세 조회 응답에만 포함
 */
export interface Job {
  id: string;
  title: string;
  description?: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  startAt: string;            // ISO 8601
  endAt: string;
  hourlyWage: number;
  estimatedMinutes: number;
  estimatedPay: number;
  recruitCount: number;
  confirmedCount: number;
  checkInRadiusM: number;
  status: JobStatus;
  createdAt?: string;
  client?: {
    id: string;
    name: string;
    ratingAvg: number;
    totalReviews: number;
  };
}

export interface MyJobsResponse {
  items: Job[];
  total: number;
  page: number;
  limit: number;
}
