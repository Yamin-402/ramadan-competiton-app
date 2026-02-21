-- CreateEnum
CREATE TYPE "MoneyTriggerType" AS ENUM ('MISS_TASK', 'COMPLETE_TASK', 'DO_FORBIDDEN', 'AVOID_FORBIDDEN');

-- CreateTable
CREATE TABLE "Streak" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "graceDaysUsed" INTEGER NOT NULL DEFAULT 0,
    "rewardMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "lastActivityDate" DATE,
    "lastEvaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyCommitment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "triggerType" "MoneyTriggerType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyEntry" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "triggerType" "MoneyTriggerType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3),
    "removedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Streak_taskId_idx" ON "Streak"("taskId");

-- CreateIndex
CREATE INDEX "Streak_userId_updatedAt_idx" ON "Streak"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Streak_userId_taskId_key" ON "Streak"("userId", "taskId");

-- CreateIndex
CREATE INDEX "MoneyCommitment_taskId_idx" ON "MoneyCommitment"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyCommitment_userId_taskId_triggerType_key" ON "MoneyCommitment"("userId", "taskId", "triggerType");

-- CreateIndex
CREATE INDEX "MoneyEntry_userId_date_idx" ON "MoneyEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyEntry_userId_taskId_date_triggerType_key" ON "MoneyEntry"("userId", "taskId", "date", "triggerType");

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streak" ADD CONSTRAINT "Streak_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyCommitment" ADD CONSTRAINT "MoneyCommitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyCommitment" ADD CONSTRAINT "MoneyCommitment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
