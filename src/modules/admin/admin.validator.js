import { z } from "zod";

const taskTypeSchema = z.enum(["NORMAL", "COUNTER", "FORBIDDEN", "CONDITIONAL", "STREAK"]);
const taskStatusSchema = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);
const counterValueSourceSchema = z.enum(["FIXED", "ACTIVITY_INPUT"]);
const conditionTypeSchema = z.enum(["TASK_COMPLETIONS", "COUNTER_TOTAL", "STREAK_DAYS", "TAG_PRESENT"]);
const conditionOperatorSchema = z.enum(["EQ", "NEQ", "GT", "GTE", "LT", "LTE"]);
const notificationTargetTypeSchema = z.enum(["ALL_USERS", "TAGS", "USER_IDS"]);
const dailyQuestionTypeSchema = z.enum(["TEXT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "BOOLEAN"]);
const categoryTagSchema = z.object({
  key: z.string().min(1),
  labelEn: z.string().min(1),
  labelAr: z.string().min(1),
});

export const createCounterSchema = z.object({
  key: z.string().min(2),
  name: z.string().min(2),
  unit: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const listAdminCountersQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const createTaskCounterRuleSchema = z.object({
  taskId: z.number().int().positive(),
  counterId: z.number().int().positive(),
  valueSource: counterValueSourceSchema.default("FIXED"),
  fixedDelta: z.number().optional(),
});

export const listTaskCounterRulesQuerySchema = z.object({
  taskId: z.coerce.number().int().positive().optional(),
  counterId: z.coerce.number().int().positive().optional(),
});

export const taskCounterRuleParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const taskParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const userParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const leaderboardVisibilitySchema = z.object({
  isVisible: z.boolean(),
});

export const createTaskSchema = z.object({
  key: z.string().min(2),
  title: z.string().min(2),
  description: z.string().optional(),
  type: taskTypeSchema,
  status: taskStatusSchema.default("ACTIVE"),
  basePoints: z.number(),
  config: z.record(z.any()).optional(),
  isPrivate: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  categoryTagId: z.number().int().positive().optional(),
  categoryTag: categoryTagSchema.optional(),
  requiredTagKeys: z.array(z.string().min(1)).default([]),
  dependencies: z
    .array(
      z.object({
        dependsOnTaskId: z.number().int().positive(),
        minCompletions: z.number().int().positive().default(1),
        withinDays: z.number().int().positive().optional(),
      })
    )
    .default([]),
  counterRules: z
    .array(
      z.object({
        counterKey: z.string().min(1),
        valueSource: counterValueSourceSchema.default("FIXED"),
        fixedDelta: z.number().optional(),
        allowNegative: z.boolean().default(false),
        metadata: z.record(z.any()).optional(),
      })
    )
    .default([]),
  conditions: z
    .array(
      z.object({
        type: conditionTypeSchema,
        operator: conditionOperatorSchema.default("GTE"),
        value: z.number(),
        targetTaskId: z.number().int().positive().optional(),
        targetCounterKey: z.string().optional(),
        targetTagKey: z.string().optional(),
        withinDays: z.number().int().positive().optional(),
      })
    )
    .default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  type: taskTypeSchema.optional(),
  status: taskStatusSchema.optional(),
  basePoints: z.number().optional(),
  config: z.record(z.any()).optional(),
  isPrivate: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  categoryTagId: z.number().int().positive().optional().nullable(),
  categoryTag: categoryTagSchema.optional().nullable(),
  requiredTagKeys: z.array(z.string().min(1)).optional(),
});

export const listAdminTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  type: taskTypeSchema.optional(),
  includePrivate: z.coerce.boolean().default(true),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const listAdminUsersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const listAdminUserActivitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export const createManualAdjustmentSchema = z.object({
  userId: z.number().int().positive(),
  points: z.number(),
  note: z.string().max(500).optional(),
  metadata: z.record(z.any()).optional(),
});

export const createNotificationCampaignSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  targetType: notificationTargetTypeSchema.default("ALL_USERS"),
  filters: z
    .object({
      tagIds: z.array(z.number().int().positive()).default([]),
      userIds: z.array(z.number().int().positive()).default([]),
    })
    .default({ tagIds: [], userIds: [] }),
});

export const listNotificationCampaignsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const notificationCampaignParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createDailyQuestionSchema = z.object({
  questionText: z.string().min(2),
  answerType: dailyQuestionTypeSchema,
  options: z.any().optional(),
  correctAnswer: z.any().optional(),
  points: z.number().default(0),
  activeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isActive: z.boolean().optional(),
});

export const updateDailyQuestionSchema = z.object({
  questionText: z.string().min(2).optional(),
  answerType: dailyQuestionTypeSchema.optional(),
  options: z.any().optional(),
  correctAnswer: z.any().optional(),
  points: z.number().optional(),
  activeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isActive: z.boolean().optional(),
});

export const listDailyQuestionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const dailyQuestionParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listDailyQuestionAnswersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export const dailyQuestionAnswerParamsSchema = z.object({
  answerId: z.coerce.number().int().positive(),
});

export const reviewDailyQuestionAnswerSchema = z.object({
  isCorrect: z.boolean(),
  awardedPoints: z.number().min(0).optional(),
});

export const adminLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(5000).default(200),
});
