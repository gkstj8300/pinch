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
DROP INDEX IF EXISTS users_active_phone_idx;
CREATE INDEX IF NOT EXISTS users_active_email_idx
  ON users(email) WHERE deleted_at IS NULL;

-- 별명(name) 중복 방지 — 활성 사용자 한정 (디자인의 "별명 (중복 불가)" 요구사항)
CREATE UNIQUE INDEX IF NOT EXISTS users_active_name_key
  ON users(name) WHERE deleted_at IS NULL;

-- 자체 가입(password_hash) 또는 OAuth(oauth_provider) 중 하나는 반드시 존재
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_auth_method,
  ADD  CONSTRAINT chk_users_auth_method
       CHECK (password_hash IS NOT NULL OR oauth_provider IS NOT NULL);

CREATE INDEX IF NOT EXISTS matches_active_worker_idx
  ON matches(worker_id, status) WHERE deleted_at IS NULL;

-- =====================================================
-- 5. Slice 2 추가분 — Wallet / Transaction / Review
-- =====================================================

-- 5.1 Review score 범위 검증
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS chk_reviews_score,
  ADD  CONSTRAINT chk_reviews_score
       CHECK (score BETWEEN 1 AND 5);

-- 5.2 Review 자기 평가 금지 (writer != target)
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS chk_reviews_no_self,
  ADD  CONSTRAINT chk_reviews_no_self
       CHECK (writer_id <> target_id);

-- 5.3 Wallet 금액 무결성
ALTER TABLE wallets
  DROP CONSTRAINT IF EXISTS chk_wallets_balance_nonneg,
  ADD  CONSTRAINT chk_wallets_balance_nonneg
       CHECK (balance >= 0);

ALTER TABLE wallets
  DROP CONSTRAINT IF EXISTS chk_wallets_pending_nonneg,
  ADD  CONSTRAINT chk_wallets_pending_nonneg
       CHECK (pending_amount >= 0);

ALTER TABLE wallets
  DROP CONSTRAINT IF EXISTS chk_wallets_totals_nonneg,
  ADD  CONSTRAINT chk_wallets_totals_nonneg
       CHECK (total_earned >= 0 AND total_withheld >= 0 AND total_withdrawn >= 0);

-- 5.4 Match 정산 스냅샷 무결성 (gross/net 은 음수 될 수 없음, COMPLETED 시 모두 NOT NULL 권장이나 강제는 안 함)
ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS chk_matches_settlement_nonneg,
  ADD  CONSTRAINT chk_matches_settlement_nonneg
       CHECK (
         (gross_amount IS NULL OR gross_amount >= 0) AND
         (withholding_tax IS NULL OR withholding_tax >= 0) AND
         (net_amount IS NULL OR net_amount >= 0) AND
         (worked_minutes IS NULL OR worked_minutes >= 0)
       );

-- 5.5 활성 데이터 부분 인덱스
CREATE INDEX IF NOT EXISTS wallets_active_user_idx
  ON wallets(user_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS transactions_active_wallet_idx
  ON transactions(wallet_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS reviews_active_target_idx
  ON reviews(target_id) WHERE deleted_at IS NULL;
