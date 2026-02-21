-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('NORMAL', 'COUNTER', 'FORBIDDEN', 'CONDITIONAL', 'STREAK');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CounterValueSource" AS ENUM ('FIXED', 'ACTIVITY_INPUT');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('TASK_COMPLETION', 'MANUAL_ADJUSTMENT', 'STREAK_EVALUATION', 'DAILY_QUESTION_ANSWER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('TASK_COMPLETIONS', 'COUNTER_TOTAL', 'STREAK_DAYS', 'TAG_PRESENT');

-- CreateEnum
CREATE TYPE "ConditionOperator" AS ENUM ('EQ', 'NEQ', 'GT', 'GTE', 'LT', 'LTE');

-- CreateEnum
CREATE TYPE "NotificationTargetType" AS ENUM ('ALL_USERS', 'TAGS', 'USER_IDS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "DailyQuestionType" AS ENUM ('TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTag" (
    "userId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTag_pkey" PRIMARY KEY ("userId","tagId")
);

-- CreateTable
CREATE TABLE "CounterDefinition" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'ACTIVE',
    "basePoints" DECIMAL(10,2) NOT NULL,
    "config" JSONB,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTagRequirement" (
    "taskId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskTagRequirement_pkey" PRIMARY KEY ("taskId","tagId")
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "dependsOnTaskId" INTEGER NOT NULL,
    "minCompletions" INTEGER NOT NULL DEFAULT 1,
    "withinDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCounterRule" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "counterId" INTEGER NOT NULL,
    "valueSource" "CounterValueSource" NOT NULL DEFAULT 'FIXED',
    "fixedDelta" DECIMAL(10,2),
    "allowNegative" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskCounterRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCondition" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "type" "ConditionType" NOT NULL,
    "operator" "ConditionOperator" NOT NULL DEFAULT 'GTE',
    "value" DECIMAL(10,2) NOT NULL,
    "targetTaskId" INTEGER,
    "targetCounterId" INTEGER,
    "targetTagId" INTEGER,
    "withinDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "type" "ActivityType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "isDuringFasting" BOOLEAN NOT NULL DEFAULT false,
    "fastingMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.00,
    "basePoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "effectivePoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "metadata" JSONB,
    "isForbidden" BOOLEAN NOT NULL DEFAULT false,
    "createdByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityCounterDelta" (
    "id" SERIAL NOT NULL,
    "activityId" INTEGER NOT NULL,
    "counterId" INTEGER NOT NULL,
    "delta" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityCounterDelta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FastingWindow" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "fajrAt" TIMESTAMP(3) NOT NULL,
    "maghribAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FastingWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationCampaign" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetType" "NotificationTargetType" NOT NULL DEFAULT 'ALL_USERS',
    "filters" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationCampaignTag" (
    "campaignId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "NotificationCampaignTag_pkey" PRIMARY KEY ("campaignId","tagId")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDevice" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "pushToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyQuestion" (
    "id" SERIAL NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerType" "DailyQuestionType" NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB,
    "points" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "activeDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyQuestionAnswer" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "answer" JSONB NOT NULL,
    "isCorrect" BOOLEAN,
    "awardedPoints" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_key_key" ON "Tag"("key");

-- CreateIndex
CREATE INDEX "UserTag_tagId_idx" ON "UserTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "CounterDefinition_key_key" ON "CounterDefinition"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Task_key_key" ON "Task"("key");

-- CreateIndex
CREATE INDEX "Task_type_status_idx" ON "Task"("type", "status");

-- CreateIndex
CREATE INDEX "Task_startsAt_endsAt_idx" ON "Task"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "TaskTagRequirement_tagId_idx" ON "TaskTagRequirement"("tagId");

-- CreateIndex
CREATE INDEX "TaskDependency_dependsOnTaskId_idx" ON "TaskDependency"("dependsOnTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_taskId_dependsOnTaskId_key" ON "TaskDependency"("taskId", "dependsOnTaskId");

-- CreateIndex
CREATE INDEX "TaskCounterRule_counterId_idx" ON "TaskCounterRule"("counterId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCounterRule_taskId_counterId_key" ON "TaskCounterRule"("taskId", "counterId");

-- CreateIndex
CREATE INDEX "TaskCondition_taskId_type_idx" ON "TaskCondition"("taskId", "type");

-- CreateIndex
CREATE INDEX "TaskCondition_targetTaskId_idx" ON "TaskCondition"("targetTaskId");

-- CreateIndex
CREATE INDEX "TaskCondition_targetCounterId_idx" ON "TaskCondition"("targetCounterId");

-- CreateIndex
CREATE INDEX "TaskCondition_targetTagId_idx" ON "TaskCondition"("targetTagId");

-- CreateIndex
CREATE INDEX "Activity_userId_occurredAt_idx" ON "Activity"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_taskId_occurredAt_idx" ON "Activity"("taskId", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_type_occurredAt_idx" ON "Activity"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "Activity_isForbidden_idx" ON "Activity"("isForbidden");

-- CreateIndex
CREATE INDEX "ActivityCounterDelta_counterId_createdAt_idx" ON "ActivityCounterDelta"("counterId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityCounterDelta_activityId_counterId_key" ON "ActivityCounterDelta"("activityId", "counterId");

-- CreateIndex
CREATE INDEX "FastingWindow_timezone_date_idx" ON "FastingWindow"("timezone", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FastingWindow_date_timezone_key" ON "FastingWindow"("date", "timezone");

-- CreateIndex
CREATE INDEX "AdminActionLog_adminId_createdAt_idx" ON "AdminActionLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_entityType_entityId_idx" ON "AdminActionLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "NotificationCampaign_status_scheduledFor_idx" ON "NotificationCampaign"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "NotificationRecipient_userId_status_idx" ON "NotificationRecipient"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_campaignId_userId_key" ON "NotificationRecipient"("campaignId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserDevice_pushToken_key" ON "UserDevice"("pushToken");

-- CreateIndex
CREATE INDEX "UserDevice_userId_platform_idx" ON "UserDevice"("userId", "platform");

-- CreateIndex
CREATE INDEX "DailyQuestion_isActive_activeDate_idx" ON "DailyQuestion"("isActive", "activeDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuestion_activeDate_key" ON "DailyQuestion"("activeDate");

-- CreateIndex
CREATE INDEX "DailyQuestionAnswer_userId_createdAt_idx" ON "DailyQuestionAnswer"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuestionAnswer_questionId_userId_key" ON "DailyQuestionAnswer"("questionId", "userId");

-- AddForeignKey
ALTER TABLE "UserTag" ADD CONSTRAINT "UserTag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTag" ADD CONSTRAINT "UserTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTagRequirement" ADD CONSTRAINT "TaskTagRequirement_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTagRequirement" ADD CONSTRAINT "TaskTagRequirement_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCounterRule" ADD CONSTRAINT "TaskCounterRule_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCounterRule" ADD CONSTRAINT "TaskCounterRule_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "CounterDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCondition" ADD CONSTRAINT "TaskCondition_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCondition" ADD CONSTRAINT "TaskCondition_targetTaskId_fkey" FOREIGN KEY ("targetTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCondition" ADD CONSTRAINT "TaskCondition_targetCounterId_fkey" FOREIGN KEY ("targetCounterId") REFERENCES "CounterDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCondition" ADD CONSTRAINT "TaskCondition_targetTagId_fkey" FOREIGN KEY ("targetTagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityCounterDelta" ADD CONSTRAINT "ActivityCounterDelta_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityCounterDelta" ADD CONSTRAINT "ActivityCounterDelta_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "CounterDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationCampaign" ADD CONSTRAINT "NotificationCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationCampaignTag" ADD CONSTRAINT "NotificationCampaignTag_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NotificationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationCampaignTag" ADD CONSTRAINT "NotificationCampaignTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "NotificationCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDevice" ADD CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQuestion" ADD CONSTRAINT "DailyQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQuestionAnswer" ADD CONSTRAINT "DailyQuestionAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "DailyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQuestionAnswer" ADD CONSTRAINT "DailyQuestionAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
