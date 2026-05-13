-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('EARNING', 'WITHHOLDING', 'WITHDRAWAL', 'REFUND', 'ADJUSTMENT', 'PENALTY');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "cancel_reason" VARCHAR(255),
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "check_in_at" TIMESTAMPTZ(6),
ADD COLUMN     "check_in_distance_m" INTEGER,
ADD COLUMN     "check_in_lat" DECIMAL(10,7),
ADD COLUMN     "check_in_lng" DECIMAL(10,7),
ADD COLUMN     "check_out_at" TIMESTAMPTZ(6),
ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "gross_amount" INTEGER,
ADD COLUMN     "net_amount" INTEGER,
ADD COLUMN     "qr_token" VARCHAR(64),
ADD COLUMN     "withholding_tax" INTEGER,
ADD COLUMN     "worked_minutes" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "cancel_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ci_hash" CHAR(88),
ADD COLUMN     "completed_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "di_hash" CHAR(88),
ADD COLUMN     "email" VARCHAR(255),
ADD COLUMN     "late_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "noshow_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "profile_img" TEXT,
ADD COLUMN     "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
ADD COLUMN     "total_reviews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "verified_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "wallets" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "pending_amount" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "total_withheld" INTEGER NOT NULL DEFAULT 0,
    "total_withdrawn" INTEGER NOT NULL DEFAULT 0,
    "bank_code" VARCHAR(10),
    "bank_account_enc" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" BIGSERIAL NOT NULL,
    "wallet_id" BIGINT NOT NULL,
    "match_id" BIGINT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "gross_amount" INTEGER NOT NULL,
    "withholding_tax" INTEGER NOT NULL DEFAULT 0,
    "net_amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" VARCHAR(255),
    "external_ref" VARCHAR(100),
    "idempotency_key" VARCHAR(100),
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" BIGSERIAL NOT NULL,
    "match_id" BIGINT NOT NULL,
    "writer_id" BIGINT NOT NULL,
    "target_id" BIGINT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotency_key_key" ON "transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "transactions_wallet_id_created_at_idx" ON "transactions"("wallet_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_type_status_idx" ON "transactions"("type", "status");

-- CreateIndex
CREATE INDEX "transactions_match_id_idx" ON "transactions"("match_id");

-- CreateIndex
CREATE INDEX "transactions_external_ref_idx" ON "transactions"("external_ref");

-- CreateIndex
CREATE INDEX "reviews_target_id_deleted_at_idx" ON "reviews"("target_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_match_id_writer_id_key" ON "reviews"("match_id", "writer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_ci_hash_key" ON "users"("ci_hash");

-- CreateIndex
CREATE INDEX "users_pinch_score_idx" ON "users"("pinch_score" DESC);

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_writer_id_fkey" FOREIGN KEY ("writer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

