ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
UPDATE "Member"
SET "qrCode" = 'GYM-' || gen_random_uuid()::text
WHERE "qrCode" IS NULL;
ALTER TABLE "Member" ALTER COLUMN "qrCode" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Member_qrCode_key" ON "Member"("qrCode");
