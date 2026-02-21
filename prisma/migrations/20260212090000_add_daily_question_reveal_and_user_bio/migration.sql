-- AlterTable
ALTER TABLE "User" ADD COLUMN "bio" TEXT;

-- AlterTable
ALTER TABLE "DailyQuestionAnswer" ADD COLUMN "isRevealed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailyQuestionAnswer" ADD COLUMN "revealedAt" TIMESTAMP(3);

-- Existing answers were previously awarded immediately, so mark them as revealed.
UPDATE "DailyQuestionAnswer"
SET "isRevealed" = true,
    "revealedAt" = COALESCE("revealedAt", "createdAt")
WHERE "isRevealed" = false;
