-- Password sign-in + company branding.
--
-- 1. Replaces OTP email sign-in with username/email + password. The OTP
--    credentials provider authorized on an email address alone, so posting an
--    address to the NextAuth callback minted a valid session with no code ever
--    being verified. The whole flow (and its token table) is removed rather
--    than patched.
-- 2. Adds brute-force protection to password sign-in.
-- 3. Adds the single-row company_settings table holding the installation's own
--    name and logo, chosen during setup.

-- --------------------------------------------------------------------------
-- Users: optional username, forced password rotation, login throttling
-- --------------------------------------------------------------------------
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users"("username");

-- --------------------------------------------------------------------------
-- Company settings (single row, id = 'default')
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "company_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- --------------------------------------------------------------------------
-- Drop the OTP token store. It only ever held short-lived login codes, so
-- there is no business data to preserve.
-- --------------------------------------------------------------------------
DROP TABLE IF EXISTS "otp_tokens";
