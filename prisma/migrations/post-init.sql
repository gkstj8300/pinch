-- =====================================================
-- PINCH - Slice 1 보강 SQL
-- 실행 시점: prisma migrate dev 가 끝난 직후 1회
--   psql $DATABASE_URL -f prisma/migrations/post-init.sql
-- 또는 docker exec -i pinch-postgres psql -U pinch -d pinch_dev < prisma/migrations/post-init.sql
-- =====================================================

-- 1. PostGIS Point 자동 동기화 트리거
CREATE OR REPLACE FUNCTION jobs_sync_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude::float, NEW.latitude::float), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_sync_location ON jobs;
CREATE TRIGGER trg_jobs_sync_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON jobs
FOR EACH ROW EXECUTE FUNCTION jobs_sync_location();

-- 2. GIST 공간 인덱스 (활성 OPEN 공고만)
CREATE INDEX IF NOT EXISTS jobs_active_location_gix
  ON jobs USING GIST (location)
  WHERE deleted_at IS NULL AND status = 'OPEN';

-- 3. CHECK 제약
ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS chk_jobs_recruit,
  ADD  CONSTRAINT chk_jobs_recruit
       CHECK (confirmed_count >= 0 AND confirmed_count <= recruit_count);

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS chk_jobs_recruit_positive,
  ADD  CONSTRAINT chk_jobs_recruit_positive
       CHECK (recruit_count > 0);

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS chk_jobs_time,
  ADD  CONSTRAINT chk_jobs_time
       CHECK (start_at < end_at);

ALTER TABLE jobs
  DROP CONSTRAINT IF EXISTS chk_jobs_wage,
  ADD  CONSTRAINT chk_jobs_wage
       CHECK (hourly_wage >= 9860);  -- 2026 최저시급 (필요 시 환경별 조정)

-- 4. Soft Delete + 활성 데이터용 부분 인덱스 (Prisma @@index는 WHERE 미지원)
CREATE INDEX IF NOT EXISTS users_active_phone_idx
  ON users(phone) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS matches_active_worker_idx
  ON matches(worker_id, status) WHERE deleted_at IS NULL;
