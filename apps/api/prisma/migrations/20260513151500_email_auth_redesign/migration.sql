-- =====================================================
-- 인증 도메인 재설계 — email/password_hash + OAuth 지원
-- - phone 컬럼/유니크 제거
-- - email NOT NULL 승격
-- - password_hash, oauth_provider, oauth_id 신설
-- - terms_agreed_at, marketing_consented_at 신설
-- - oauth 복합 유니크 (oauth_provider, oauth_id)
-- =====================================================

-- 1) phone 관련 제거
DROP INDEX IF EXISTS "users_phone_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "phone";

-- 2) email NOT NULL 승격 (v2 마이그레이션에서 nullable로 추가됐던 컬럼)
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;

-- 3) 신규 컬럼 — 인증
ALTER TABLE "users"
  ADD COLUMN "password_hash" VARCHAR(255),
  ADD COLUMN "oauth_provider" VARCHAR(20),
  ADD COLUMN "oauth_id" VARCHAR(100);

-- 4) 신규 컬럼 — 약관/마케팅 동의
ALTER TABLE "users"
  ADD COLUMN "terms_agreed_at" TIMESTAMPTZ(6),
  ADD COLUMN "marketing_consented_at" TIMESTAMPTZ(6);

-- 5) OAuth 복합 유니크 (NULL 행은 중복으로 보지 않으므로 자체 가입과 OAuth 가입 공존 가능)
CREATE UNIQUE INDEX "users_oauth_key" ON "users"("oauth_provider", "oauth_id");
