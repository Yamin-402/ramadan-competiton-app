import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import { AdminCounter, AdminTask, CounterValueSource, Tag, TaskType } from "../types";

interface TasksModuleProps {
  tasks: AdminTask[];
  counters: AdminCounter[];
  tags: Tag[];
  onRefreshReferences: () => Promise<void>;
}

type VisibilityType = "NORMAL" | "FORBIDDEN";
type FlowType = "NORMAL" | "COUNTER" | "TIMED" | "CONDITIONAL";
type AudienceType =
  | "ALL"
  | "SCHOOL"
  | "UNIVERSITY"
  | "SCHOOL_EGYPTIAN"
  | "SCHOOL_FOREIGN";
type CompletionPolicy = "SINGLE" | "MULTIPLE_LIMITED" | "MULTIPLE_UNLIMITED";
type StreakBonusMode = "ONE_TIME" | "RECURRING_SAME" | "RECURRING_CUSTOM";
type ConditionalMode = "EXISTING_TASKS" | "NEW_CHILD_TASKS";
type PartialRewardMode = "BY_COUNT" | "BY_TASKS";
type ConditionalScoringMode = "TIER" | "PERCENT_PER_CHILD" | "POINTS_PER_CHILD";

interface TaskFormState {
  title: string;
  points: string;
  description: string;
  key: string;
  visibility: VisibilityType;
  flow: FlowType;
  audience: AudienceType;
  categoryTagId: string;
  categoryTagKey: string;
  categoryTagLabelEn: string;
  categoryTagLabelAr: string;
  streakEnabled: boolean;
  streakGoalDays: string;
  streakBonusPoints: string;
  streakBonusMode: StreakBonusMode;
  streakRepeatEveryDays: string;
  completionPolicy: CompletionPolicy;
  completionLimit: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  enableCounterRule: boolean;
  counterKey: string;
  counterValueSource: CounterValueSource;
  counterFixedDelta: string;
  conditionEnabled: boolean;
  conditionTargetTaskId: string;
  conditionValue: string;
  conditionalMode: ConditionalMode;
  conditionalScoringMode: ConditionalScoringMode;
  conditionalPerChildPercent: string;
  conditionalPerChildPoints: string;
  conditionalChildTaskIds: string[];
  conditionalPartialMode: PartialRewardMode;
  conditionalPartialCount: string;
  conditionalPartialPoints: string;
  conditionalPartialRequiredTaskIds: string[];
  conditionalFullPoints: string;
  conditionalInlineTasks: Array<{
    key: string;
    titleEn: string;
    titleAr: string;
  }>;
  conditionalInlinePartialMode: PartialRewardMode;
  conditionalInlinePartialCount: string;
  conditionalInlinePartialPoints: string;
  conditionalInlinePartialRequiredKeys: string[];
  conditionalInlineFullPoints: string;
}

const defaultForm: TaskFormState = {
  title: "",
  points: "0",
  description: "",
  key: "",
  visibility: "NORMAL",
  flow: "NORMAL",
  audience: "ALL",
  categoryTagId: "",
  categoryTagKey: "",
  categoryTagLabelEn: "",
  categoryTagLabelAr: "",
  streakEnabled: false,
  streakGoalDays: "7",
  streakBonusPoints: "0",
  streakBonusMode: "ONE_TIME",
  streakRepeatEveryDays: "7",
  completionPolicy: "SINGLE",
  completionLimit: "2",
  active: true,
  startsAt: "",
  endsAt: "",
  enableCounterRule: false,
  counterKey: "",
  counterValueSource: "ACTIVITY_INPUT",
  counterFixedDelta: "",
  conditionEnabled: false,
  conditionTargetTaskId: "",
  conditionValue: "1",
  conditionalMode: "EXISTING_TASKS",
  conditionalScoringMode: "TIER",
  conditionalPerChildPercent: "",
  conditionalPerChildPoints: "",
  conditionalChildTaskIds: [],
  conditionalPartialMode: "BY_COUNT",
  conditionalPartialCount: "",
  conditionalPartialPoints: "",
  conditionalPartialRequiredTaskIds: [],
  conditionalFullPoints: "",
  conditionalInlineTasks: [],
  conditionalInlinePartialMode: "BY_COUNT",
  conditionalInlinePartialCount: "",
  conditionalInlinePartialPoints: "",
  conditionalInlinePartialRequiredKeys: [],
  conditionalInlineFullPoints: "",
};

function normalizeKey(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || `task_${Date.now()}`;
}

function normalizeCategoryTagKey(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || `category_${Date.now()}`;
}

function findTagKeyByKeywords(tags: Tag[], keywords: string[]): string | null {
  const found = tags.find((tag) =>
    keywords.some((keyword) => tag.key.toLowerCase().includes(keyword.toLowerCase()))
  );

  return found?.key || null;
}

function resolveAudienceTagKeys(tags: Tag[], audience: AudienceType): string[] {
  if (audience === "ALL") {
    return [];
  }

  const schoolTagKey = findTagKeyByKeywords(tags, ["school", "student"]);
  const universityTagKey = findTagKeyByKeywords(tags, ["university", "uni", "college"]);
  const egyptianTagKey = findTagKeyByKeywords(tags, ["egyptian", "masri", "egypt"]);
  const foreignTagKey = findTagKeyByKeywords(tags, ["foreign", "international", "non-egyptian"]);

  if (audience === "SCHOOL") {
    return schoolTagKey ? [schoolTagKey] : [];
  }

  if (audience === "UNIVERSITY") {
    return universityTagKey ? [universityTagKey] : [];
  }

  if (audience === "SCHOOL_EGYPTIAN") {
    return [schoolTagKey, egyptianTagKey].filter(Boolean) as string[];
  }

  return [schoolTagKey, foreignTagKey].filter(Boolean) as string[];
}

function flowFromTask(task: AdminTask): FlowType {
  const flow = task.config?.taskFlowType;
  if (flow === "COUNTER" || flow === "TIMED" || flow === "CONDITIONAL" || flow === "NORMAL") {
    return flow;
  }
  if (task.type === "COUNTER" || task.type === "CONDITIONAL") {
    return task.type;
  }
  return "NORMAL";
}

function audienceFromTask(task: AdminTask): AudienceType {
  const keys = (task.tagRequirements || []).map((row) => row.tag.key.toLowerCase());
  const hasSchool = keys.some((key) => key.includes("school"));
  const hasUniversity = keys.some((key) => key.includes("university") || key.includes("uni"));
  const hasEgyptian = keys.some((key) => key.includes("egyptian") || key.includes("masri"));
  const hasForeign = keys.some((key) => key.includes("foreign") || key.includes("international"));

  if (hasSchool && hasEgyptian) {
    return "SCHOOL_EGYPTIAN";
  }
  if (hasSchool && hasForeign) {
    return "SCHOOL_FOREIGN";
  }
  if (hasSchool) {
    return "SCHOOL";
  }
  if (hasUniversity) {
    return "UNIVERSITY";
  }
  return "ALL";
}

function audienceLabel(audience: AudienceType): string {
  switch (audience) {
    case "SCHOOL":
      return "School";
    case "UNIVERSITY":
      return "University";
    case "SCHOOL_EGYPTIAN":
      return "School - Egyptian";
    case "SCHOOL_FOREIGN":
      return "School - Foreign";
    default:
      return "All";
  }
}

function completionPolicyLabel(task: AdminTask): string {
  const policy = completionPolicyFromTask(task);
  if (policy === "SINGLE") {
    return "Once";
  }
  if (policy === "MULTIPLE_UNLIMITED") {
    return "Unlimited";
  }

  const limit = completionLimitFromTask(task);
  return `Up to ${limit}`;
}

function isStreakEnabled(task: AdminTask): boolean {
  return task.config?.streakEnabled === true || task.type === "STREAK";
}

function completionPolicyFromTask(task: AdminTask): CompletionPolicy {
  const rawPolicy = typeof task.config?.completionPolicy === "string"
    ? task.config.completionPolicy.toUpperCase()
    : null;
  if (rawPolicy === "SINGLE" || rawPolicy === "MULTIPLE_LIMITED" || rawPolicy === "MULTIPLE_UNLIMITED") {
    return rawPolicy;
  }

  const maxRaw = task.config?.maxCompletionsPerCompetitionDay;
  const maxValue = typeof maxRaw === "number" ? maxRaw : Number(maxRaw);
  if (Number.isFinite(maxValue) && maxValue > 1) {
    return "MULTIPLE_LIMITED";
  }

  const multiRaw = task.config?.allowMultipleCompletionsPerCompetitionDay;
  const allowMultiple =
    multiRaw === true || (typeof multiRaw === "string" && multiRaw.trim().toLowerCase() === "true");
  if (allowMultiple || flowFromTask(task) === "COUNTER" || flowFromTask(task) === "TIMED") {
    return "MULTIPLE_UNLIMITED";
  }

  return "SINGLE";
}

function completionLimitFromTask(task: AdminTask): string {
  const maxRaw = task.config?.maxCompletionsPerCompetitionDay;
  const maxValue = typeof maxRaw === "number" ? maxRaw : Number(maxRaw);
  if (Number.isFinite(maxValue) && maxValue > 1) {
    return String(Math.floor(maxValue));
  }

  return "2";
}

function streakBonusModeFromTask(task: AdminTask): StreakBonusMode {
  const raw = typeof task.config?.streakBonusMode === "string"
    ? task.config.streakBonusMode.toUpperCase()
    : "";
  if (raw === "RECURRING_SAME" || raw === "RECURRING_CUSTOM") {
    return raw;
  }
  return "ONE_TIME";
}

function parseConditionalModeFromTask(task: AdminTask): ConditionalMode {
  const rawMode = typeof task.config?.conditionalChildSource === "string"
    ? task.config.conditionalChildSource.toUpperCase()
    : "";
  if (rawMode === "EXISTING_TASKS" || rawMode === "NEW_CHILD_TASKS") {
    return rawMode;
  }

  const hasExisting = Array.isArray(task.config?.conditionalChildTaskIds)
    && task.config.conditionalChildTaskIds.length > 0;
  const hasInline = Array.isArray(task.config?.conditionalInlineTasks)
    && task.config.conditionalInlineTasks.length > 0;

  if (hasInline && !hasExisting) {
    return "NEW_CHILD_TASKS";
  }

  return "EXISTING_TASKS";
}

function parseConditionalScoringModeFromTask(task: AdminTask): ConditionalScoringMode {
  const rawMode = typeof task.config?.conditionalScoringMode === "string"
    ? task.config.conditionalScoringMode.toUpperCase()
    : "";

  if (rawMode === "PERCENT_PER_CHILD" || rawMode === "POINTS_PER_CHILD" || rawMode === "TIER") {
    return rawMode;
  }

  return "TIER";
}

export function TasksModule({ tasks, counters, tags, onRefreshReferences }: TasksModuleProps) {
  const [form, setForm] = useState<TaskFormState>(defaultForm);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newInlineTaskName, setNewInlineTaskName] = useState("");
  const [fastingMultiplier, setFastingMultiplier] = useState("1");
  const [iftarMultiplier, setIftarMultiplier] = useState("1.5");
  const [savingMultiplier, setSavingMultiplier] = useState(false);

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => b.id - a.id), [tasks]);
  const categoryTags = useMemo(
    () => tags.filter((tag) => tag.key.startsWith("task_category:")),
    [tags]
  );
  const editingTask = useMemo(
    () => (editingTaskId ? tasks.find((task) => task.id === editingTaskId) || null : null),
    [editingTaskId, tasks]
  );

  const setField = <K extends keyof TaskFormState>(key: K, value: TaskFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    let mounted = true;

    const loadScoringSettings = async () => {
      try {
        const settings = await adminApi.getScoringSettings();
        if (!mounted) {
          return;
        }
        setFastingMultiplier(String(settings.fastingMultiplier));
        setIftarMultiplier(String(settings.iftarMultiplier));
      } catch {
        // keep defaults
      }
    };

    void loadScoringSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const fillFormFromTask = (task: AdminTask) => {
    const conditionalMode = parseConditionalModeFromTask(task);
    const parsedChildTaskIds = Array.isArray(task.config?.conditionalChildTaskIds)
      ? task.config.conditionalChildTaskIds.map((value) => String(value))
      : [];
    const parsedRewardTiers = Array.isArray(task.config?.conditionalRewardTiers)
      ? task.config.conditionalRewardTiers
          .map((tier) => ({
            requiredCount: Number((tier as { requiredCount?: unknown }).requiredCount),
            points: Number((tier as { points?: unknown }).points),
            requiredTaskIds: Array.isArray((tier as { requiredTaskIds?: unknown }).requiredTaskIds)
              ? (tier as { requiredTaskIds?: unknown[] }).requiredTaskIds
                  ?.map((value) => String(value))
                  .filter(Boolean) || []
              : [],
          }))
          .filter((tier) => Number.isFinite(tier.requiredCount) && Number.isFinite(tier.points))
          .sort((a, b) => a.requiredCount - b.requiredCount)
      : [];
    const parsedInlineTasks = Array.isArray(task.config?.conditionalInlineTasks)
      ? task.config.conditionalInlineTasks
          .map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              return null;
            }
            const keyRaw = String((item as { key?: unknown }).key ?? "").trim();
            const titleEn = String((item as { titleEn?: unknown }).titleEn ?? "").trim();
            const titleAr = String((item as { titleAr?: unknown }).titleAr ?? "").trim();
            if (!keyRaw || (!titleEn && !titleAr)) {
              return null;
            }
            const normalizedTitle = titleEn || titleAr;
            return {
              key: keyRaw,
              titleEn: normalizedTitle,
              titleAr: normalizedTitle,
            };
          })
          .filter(Boolean) as Array<{ key: string; titleEn: string; titleAr: string }>
      : [];
    const parsedInlineRewardTiers = Array.isArray(task.config?.conditionalInlineRewardTiers)
      ? task.config.conditionalInlineRewardTiers
          .map((tier) => ({
            requiredCount: Number((tier as { requiredCount?: unknown }).requiredCount),
            points: Number((tier as { points?: unknown }).points),
            requiredInlineTaskKeys: Array.isArray(
              (tier as { requiredInlineTaskKeys?: unknown }).requiredInlineTaskKeys
            )
              ? (tier as { requiredInlineTaskKeys?: unknown[] }).requiredInlineTaskKeys
                  ?.map((value) => String(value))
                  .filter(Boolean) || []
              : [],
          }))
          .filter((tier) => Number.isFinite(tier.requiredCount) && Number.isFinite(tier.points))
          .sort((a, b) => a.requiredCount - b.requiredCount)
      : [];

    const existingFullTier =
      parsedChildTaskIds.length > 0
        ? parsedRewardTiers.find((tier) => tier.requiredCount >= parsedChildTaskIds.length)
          || parsedRewardTiers[parsedRewardTiers.length - 1]
        : parsedRewardTiers[parsedRewardTiers.length - 1];
    const existingPartialTier =
      parsedRewardTiers.find((tier) =>
        existingFullTier ? tier.requiredCount < existingFullTier.requiredCount : true
      ) || null;

    const inlineFullTier =
      parsedInlineTasks.length > 0
        ? parsedInlineRewardTiers.find((tier) => tier.requiredCount >= parsedInlineTasks.length)
          || parsedInlineRewardTiers[parsedInlineRewardTiers.length - 1]
        : parsedInlineRewardTiers[parsedInlineRewardTiers.length - 1];
    const inlinePartialTier =
      parsedInlineRewardTiers.find((tier) =>
        inlineFullTier ? tier.requiredCount < inlineFullTier.requiredCount : true
      ) || null;

    const configPartialMode = typeof task.config?.conditionalPartialMode === "string"
      ? task.config.conditionalPartialMode.toUpperCase()
      : "";
    const conditionalPartialMode: PartialRewardMode =
      configPartialMode === "BY_COUNT" || configPartialMode === "BY_TASKS"
        ? configPartialMode
        : existingPartialTier?.requiredTaskIds.length
          ? "BY_TASKS"
          : "BY_COUNT";

    const configInlinePartialMode = typeof task.config?.conditionalInlinePartialMode === "string"
      ? task.config.conditionalInlinePartialMode.toUpperCase()
      : "";
    const conditionalInlinePartialMode: PartialRewardMode =
      configInlinePartialMode === "BY_COUNT" || configInlinePartialMode === "BY_TASKS"
        ? configInlinePartialMode
        : inlinePartialTier?.requiredInlineTaskKeys.length
          ? "BY_TASKS"
          : "BY_COUNT";

    setForm({
      ...defaultForm,
      title: task.title,
      points: String(task.basePoints),
      description: task.description || "",
      key: task.key,
      visibility: task.type === "FORBIDDEN" ? "FORBIDDEN" : "NORMAL",
      flow: flowFromTask(task),
      audience: audienceFromTask(task),
      categoryTagId: task.categoryTag ? String(task.categoryTag.id) : "",
      categoryTagKey: "",
      categoryTagLabelEn: "",
      categoryTagLabelAr: "",
      streakEnabled: isStreakEnabled(task),
      streakGoalDays: String(task.config?.streakGoalDays ?? 7),
      streakBonusPoints: String(task.config?.streakBonusPoints ?? 0),
      streakBonusMode: streakBonusModeFromTask(task),
      streakRepeatEveryDays: String(task.config?.streakRepeatEveryDays ?? task.config?.streakGoalDays ?? 7),
      completionPolicy: completionPolicyFromTask(task),
      completionLimit: completionLimitFromTask(task),
      active: task.status === "ACTIVE",
      startsAt: task.startsAt ? new Date(task.startsAt).toISOString() : "",
      endsAt: task.endsAt ? new Date(task.endsAt).toISOString() : "",
      conditionalMode,
      conditionalScoringMode: parseConditionalScoringModeFromTask(task),
      conditionalPerChildPercent: String(task.config?.conditionalPerChildPercent ?? ""),
      conditionalPerChildPoints: String(task.config?.conditionalPerChildPoints ?? ""),
      conditionalChildTaskIds: parsedChildTaskIds,
      conditionalPartialMode,
      conditionalPartialCount:
        conditionalPartialMode === "BY_COUNT" && existingPartialTier
          ? String(existingPartialTier.requiredCount || "")
          : "",
      conditionalPartialPoints: existingPartialTier ? String(existingPartialTier.points) : "",
      conditionalPartialRequiredTaskIds: existingPartialTier?.requiredTaskIds || [],
      conditionalFullPoints: existingFullTier ? String(existingFullTier.points) : "",
      conditionalInlineTasks: parsedInlineTasks,
      conditionalInlinePartialMode,
      conditionalInlinePartialCount:
        conditionalInlinePartialMode === "BY_COUNT" && inlinePartialTier
          ? String(inlinePartialTier.requiredCount || "")
          : "",
      conditionalInlinePartialPoints: inlinePartialTier ? String(inlinePartialTier.points) : "",
      conditionalInlinePartialRequiredKeys: inlinePartialTier?.requiredInlineTaskKeys || [],
      conditionalInlineFullPoints: inlineFullTier ? String(inlineFullTier.points) : "",
    });
    setEditingTaskId(task.id);
    setNewInlineTaskName("");
    setError(null);
    setSuccess(null);
  };

  const resetForm = () => {
    setForm(defaultForm);
    setNewInlineTaskName("");
    setEditingTaskId(null);
  };

  const addInlineTask = () => {
    const title = newInlineTaskName.trim();
    if (!title) {
      return;
    }

    const key = normalizeCategoryTagKey(title);
    if (form.conditionalInlineTasks.some((item) => item.key === key)) {
      setError("Inline task key already exists. Change the task title.");
      return;
    }

    setField("conditionalInlineTasks", [
      ...form.conditionalInlineTasks,
      {
        key,
        titleEn: title,
        titleAr: title,
      },
    ]);
    setNewInlineTaskName("");
  };

  const removeInlineTask = (key: string) => {
    setField(
      "conditionalInlineTasks",
      form.conditionalInlineTasks.filter((item) => item.key !== key)
    );
    setField(
      "conditionalInlinePartialRequiredKeys",
      form.conditionalInlinePartialRequiredKeys.filter((item) => item !== key)
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const points = Number(form.points);
      if (Number.isNaN(points)) {
        throw new Error("Points must be numeric.");
      }

      if (form.streakEnabled) {
        const streakGoalDays = Number(form.streakGoalDays);
        const streakBonusPoints = Number(form.streakBonusPoints);
        if (!Number.isFinite(streakGoalDays) || streakGoalDays <= 0) {
          throw new Error("Streak goal days must be greater than 0.");
        }
        if (!Number.isFinite(streakBonusPoints) || streakBonusPoints <= 0) {
          throw new Error("Streak bonus points must be greater than 0.");
        }
        if (form.streakBonusMode === "RECURRING_CUSTOM") {
          const repeatEvery = Number(form.streakRepeatEveryDays);
          if (!Number.isFinite(repeatEvery) || repeatEvery <= 0) {
            throw new Error("Custom streak repeat days must be greater than 0.");
          }
        }
      }

      if (form.completionPolicy === "MULTIPLE_LIMITED") {
        const limit = Number(form.completionLimit);
        if (!Number.isFinite(limit) || limit < 2) {
          throw new Error("Daily completion limit must be 2 or more.");
        }
      }

      if (form.flow === "CONDITIONAL") {
        const perChildPercent = Number(form.conditionalPerChildPercent);
        const perChildPoints = Number(form.conditionalPerChildPoints);

        if (form.conditionalMode === "EXISTING_TASKS") {
          if (form.conditionalChildTaskIds.length === 0) {
            throw new Error("Select at least one existing child task.");
          }

          if (form.conditionalScoringMode === "TIER") {
            if (!form.conditionalFullPoints || Number(form.conditionalFullPoints) <= 0) {
              throw new Error("Conditional full points must be greater than 0.");
            }

            if (form.conditionalPartialPoints) {
              if (Number(form.conditionalPartialPoints) <= 0) {
                throw new Error("Conditional partial points must be greater than 0.");
              }
              if (form.conditionalPartialMode === "BY_COUNT") {
                if (!form.conditionalPartialCount || Number(form.conditionalPartialCount) <= 0) {
                  throw new Error("Set a valid partial count for conditional task.");
                }
              } else if (form.conditionalPartialRequiredTaskIds.length === 0) {
                throw new Error("Select at least one child task for partial-by-task mode.");
              }
            }
          } else if (form.conditionalScoringMode === "PERCENT_PER_CHILD") {
            if (!Number.isFinite(perChildPercent) || perChildPercent <= 0) {
              throw new Error("Per-child percentage must be greater than 0.");
            }
          } else {
            if (!Number.isFinite(perChildPoints) || perChildPoints <= 0) {
              throw new Error("Per-child points must be greater than 0.");
            }
            if (perChildPoints * form.conditionalChildTaskIds.length > points) {
              throw new Error("Per-child points total cannot exceed task points.");
            }
          }
        } else {
          if (form.conditionalInlineTasks.length === 0) {
            throw new Error("Add at least one child task.");
          }

          if (form.conditionalScoringMode === "TIER") {
            if (!form.conditionalInlineFullPoints || Number(form.conditionalInlineFullPoints) <= 0) {
              throw new Error("Conditional full points must be greater than 0.");
            }

            if (form.conditionalInlinePartialPoints) {
              if (Number(form.conditionalInlinePartialPoints) <= 0) {
                throw new Error("Conditional partial points must be greater than 0.");
              }
              if (form.conditionalInlinePartialMode === "BY_COUNT") {
                if (
                  !form.conditionalInlinePartialCount
                  || Number(form.conditionalInlinePartialCount) <= 0
                ) {
                  throw new Error("Set a valid partial count for child tasks.");
                }
              } else if (form.conditionalInlinePartialRequiredKeys.length === 0) {
                throw new Error("Select at least one child task for partial-by-task mode.");
              }
            }
          } else if (form.conditionalScoringMode === "PERCENT_PER_CHILD") {
            if (!Number.isFinite(perChildPercent) || perChildPercent <= 0) {
              throw new Error("Per-child percentage must be greater than 0.");
            }
          } else {
            if (!Number.isFinite(perChildPoints) || perChildPoints <= 0) {
              throw new Error("Per-child points must be greater than 0.");
            }
            if (perChildPoints * form.conditionalInlineTasks.length > points) {
              throw new Error("Per-child points total cannot exceed task points.");
            }
          }
        }
      }

      const audienceTagKeys = resolveAudienceTagKeys(tags, form.audience);
      if (form.audience !== "ALL" && audienceTagKeys.length === 0) {
        throw new Error("Audience tags were not found in current tags.");
      }

      const backendType: TaskType =
        form.visibility === "FORBIDDEN"
          ? "FORBIDDEN"
          : form.flow === "TIMED"
            ? "COUNTER"
            : form.flow;

      const hasNewCategoryTag =
        form.categoryTagLabelEn.trim().length > 0 || form.categoryTagLabelAr.trim().length > 0;
      if (hasNewCategoryTag && (!form.categoryTagLabelEn.trim() || !form.categoryTagLabelAr.trim())) {
        throw new Error("New category tag needs both English and Arabic labels.");
      }

      const conditionalExistingFullCount = form.conditionalChildTaskIds.length;
      const conditionalExistingPartialCount =
        form.conditionalPartialMode === "BY_TASKS"
          ? form.conditionalPartialRequiredTaskIds.length
          : Number(form.conditionalPartialCount || "0");
      const conditionalInlineFullCount = form.conditionalInlineTasks.length;
      const conditionalInlinePartialCount =
        form.conditionalInlinePartialMode === "BY_TASKS"
          ? form.conditionalInlinePartialRequiredKeys.length
          : Number(form.conditionalInlinePartialCount || "0");

      const conditionalRewardTiers =
        form.flow === "CONDITIONAL"
        && form.conditionalMode === "EXISTING_TASKS"
        && form.conditionalScoringMode === "TIER"
          ? [
              ...(form.conditionalPartialPoints && conditionalExistingPartialCount > 0
                ? [
                    {
                      requiredCount: conditionalExistingPartialCount,
                      points: Number(form.conditionalPartialPoints),
                      requiredTaskIds:
                        form.conditionalPartialMode === "BY_TASKS"
                          ? form.conditionalPartialRequiredTaskIds
                              .map((value) => Number(value))
                              .filter((value) => Number.isInteger(value) && value > 0)
                          : [],
                    },
                  ]
                : []),
              ...(conditionalExistingFullCount > 0 && form.conditionalFullPoints
                ? [
                    {
                      requiredCount: conditionalExistingFullCount,
                      points: Number(form.conditionalFullPoints),
                      requiredTaskIds: form.conditionalChildTaskIds
                        .map((value) => Number(value))
                        .filter((value) => Number.isInteger(value) && value > 0),
                    },
                  ]
                : []),
            ]
          : [];

      const conditionalInlineRewardTiers =
        form.flow === "CONDITIONAL"
        && form.conditionalMode === "NEW_CHILD_TASKS"
        && form.conditionalScoringMode === "TIER"
          ? [
              ...(form.conditionalInlinePartialPoints && conditionalInlinePartialCount > 0
                ? [
                    {
                      requiredCount: conditionalInlinePartialCount,
                      points: Number(form.conditionalInlinePartialPoints),
                      requiredInlineTaskKeys:
                        form.conditionalInlinePartialMode === "BY_TASKS"
                          ? form.conditionalInlinePartialRequiredKeys
                          : [],
                    },
                  ]
                : []),
              ...(conditionalInlineFullCount > 0 && form.conditionalInlineFullPoints
                ? [
                    {
                      requiredCount: conditionalInlineFullCount,
                      points: Number(form.conditionalInlineFullPoints),
                    },
                  ]
                : []),
            ]
          : [];

      const config = {
        taskVisibility: form.visibility,
        taskFlowType: form.flow,
        streakEnabled: form.streakEnabled,
        streakGoalDays: form.streakEnabled ? Number(form.streakGoalDays || "0") : null,
        streakBonusPoints: form.streakEnabled ? Number(form.streakBonusPoints || "0") : null,
        streakBonusMode: form.streakEnabled ? form.streakBonusMode : null,
        streakRepeatEveryDays:
          form.streakEnabled && form.streakBonusMode === "RECURRING_CUSTOM"
            ? Number(form.streakRepeatEveryDays || "0")
            : null,
        audience: form.audience,
        completionPolicy: form.completionPolicy,
        allowMultipleCompletionsPerCompetitionDay: form.completionPolicy !== "SINGLE",
        maxCompletionsPerCompetitionDay:
          form.completionPolicy === "MULTIPLE_LIMITED"
            ? Number(form.completionLimit)
            : null,
        conditionalChildSource: form.flow === "CONDITIONAL" ? form.conditionalMode : null,
        conditionalScoringMode: form.flow === "CONDITIONAL" ? form.conditionalScoringMode : null,
        conditionalPerChildPercent:
          form.flow === "CONDITIONAL" && form.conditionalScoringMode === "PERCENT_PER_CHILD"
            ? Number(form.conditionalPerChildPercent || "0")
            : null,
        conditionalPerChildPoints:
          form.flow === "CONDITIONAL" && form.conditionalScoringMode === "POINTS_PER_CHILD"
            ? Number(form.conditionalPerChildPoints || "0")
            : null,
        conditionalPartialMode:
          form.flow === "CONDITIONAL"
          && form.conditionalMode === "EXISTING_TASKS"
          && form.conditionalScoringMode === "TIER"
            ? form.conditionalPartialMode
            : null,
        conditionalInlinePartialMode:
          form.flow === "CONDITIONAL"
          && form.conditionalMode === "NEW_CHILD_TASKS"
          && form.conditionalScoringMode === "TIER"
            ? form.conditionalInlinePartialMode
            : null,
        conditionalChildTaskIds:
          form.flow === "CONDITIONAL" && form.conditionalMode === "EXISTING_TASKS"
            ? form.conditionalChildTaskIds
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value) && value > 0)
            : [],
        conditionalRewardTiers,
        conditionalInlineTasks:
          form.flow === "CONDITIONAL" && form.conditionalMode === "NEW_CHILD_TASKS"
            ? form.conditionalInlineTasks.map((item) => ({
                key: item.key,
                titleEn: item.titleEn,
                titleAr: item.titleAr,
              }))
            : [],
        conditionalInlineRewardTiers,
      };

      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: backendType,
        status: (form.active ? "ACTIVE" : "DRAFT") as "ACTIVE" | "DRAFT",
        basePoints: points,
        config,
        isPrivate: form.visibility === "FORBIDDEN",
        startsAt: form.startsAt.trim() || undefined,
        endsAt: form.endsAt.trim() || undefined,
        categoryTagId: form.categoryTagId ? Number(form.categoryTagId) : undefined,
        categoryTag: hasNewCategoryTag
          ? {
              key: normalizeCategoryTagKey(form.categoryTagKey || form.categoryTagLabelEn),
              labelEn: form.categoryTagLabelEn.trim(),
              labelAr: form.categoryTagLabelAr.trim(),
            }
          : undefined,
        requiredTagKeys: audienceTagKeys,
      };

      if (editingTaskId) {
        await adminApi.updateTask(editingTaskId, {
          ...payload,
          description: form.description.trim() || null,
          startsAt: form.startsAt.trim() || null,
          endsAt: form.endsAt.trim() || null,
          categoryTagId:
            hasNewCategoryTag
              ? undefined
              : form.categoryTagId
                ? Number(form.categoryTagId)
                : null,
        });
        setSuccess("Task updated.");
      } else {
        await adminApi.createTask({
          key: form.key.trim() ? normalizeKey(form.key) : normalizeKey(form.title),
          ...payload,
          dependencies: [],
          counterRules:
            form.enableCounterRule && form.counterKey
              ? [
                  {
                    counterKey: form.counterKey,
                    valueSource: form.counterValueSource,
                    fixedDelta:
                      form.counterValueSource === "FIXED" && form.counterFixedDelta
                        ? Number(form.counterFixedDelta)
                        : undefined,
                    allowNegative: false,
                  },
                ]
              : [],
          conditions:
            form.flow === "CONDITIONAL" && form.conditionEnabled
              ? [
                  {
                    type: "TASK_COMPLETIONS",
                    operator: "GTE",
                    value: Number(form.conditionValue || "1"),
                    targetTaskId: form.conditionTargetTaskId
                      ? Number(form.conditionTargetTaskId)
                      : undefined,
                  },
                ]
              : [],
        });
        setSuccess("Task created.");
      }

      await onRefreshReferences();
      resetForm();
    } catch (err) {
      setError(toApiErrorMessage(err, "Task save failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const removeTask = async (task: AdminTask) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await adminApi.deleteTask(task.id);
      await onRefreshReferences();
      if (editingTaskId === task.id) {
        resetForm();
      }
      setSuccess("Task deleted.");
    } catch (err) {
      setError(toApiErrorMessage(err, "Task delete failed"));
    }
  };

  const saveScoringSettings = async () => {
    setError(null);
    setSuccess(null);
    setSavingMultiplier(true);
    try {
      const fasting = Number(fastingMultiplier);
      const iftar = Number(iftarMultiplier);
      if (!Number.isFinite(fasting) || fasting < 1 || !Number.isFinite(iftar) || iftar < 1) {
        throw new Error("Multipliers must be numbers greater than or equal to 1.");
      }

      await adminApi.updateScoringSettings({
        fastingMultiplier: fasting,
        iftarMultiplier: iftar,
      });
      setSuccess("Scoring settings updated.");
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not update scoring settings"));
    } finally {
      setSavingMultiplier(false);
    }
  };

  return (
    <div className="stack">
      <PanelCard title="Timing Multipliers">
        <div className="form-grid">
          <label>
            Fasting multiplier
            <input
              value={fastingMultiplier}
              onChange={(e) => setFastingMultiplier(e.target.value)}
              type="number"
              step="0.01"
              min={1}
            />
          </label>

          <label>
            Iftar multiplier
            <input
              value={iftarMultiplier}
              onChange={(e) => setIftarMultiplier(e.target.value)}
              type="number"
              step="0.01"
              min={1}
            />
          </label>

          <div className="form-grid__full inline-form">
            <button type="button" onClick={() => void saveScoringSettings()} disabled={savingMultiplier}>
              {savingMultiplier ? "Saving..." : "Save multiplier settings"}
            </button>
          </div>
        </div>
      </PanelCard>

      <PanelCard title={editingTask ? `Edit Task: ${editingTask.title}` : "Create Task"}>
        <form className="form-grid tasks-form-grid" onSubmit={submit}>
          <p className="form-grid__full tasks-section-title">Basic Task Data</p>
          <label>
            Title
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} required />
          </label>

          <label>
            Points
            <input value={form.points} onChange={(e) => setField("points", e.target.value)} type="number" />
          </label>

          <label>
            Visibility
            <select value={form.visibility} onChange={(e) => setField("visibility", e.target.value as VisibilityType)}>
              <option value="NORMAL">Normal</option>
              <option value="FORBIDDEN">Forbidden</option>
            </select>
          </label>

          <label>
            Task Type
            <select
              value={form.flow}
              onChange={(e) => {
                const nextFlow = e.target.value as FlowType;
                setField("flow", nextFlow);
                if ((nextFlow === "COUNTER" || nextFlow === "TIMED") && form.completionPolicy === "SINGLE") {
                  setField("completionPolicy", "MULTIPLE_UNLIMITED");
                }
              }}
            >
              <option value="NORMAL">Normal</option>
              <option value="COUNTER">Counter</option>
              <option value="TIMED">Timed (minutes &gt;-&gt; points/hour)</option>
              <option value="CONDITIONAL">Conditional</option>
            </select>
          </label>

          <p className="form-grid__full tasks-section-title">Audience & Category</p>
          <label>
            Audience
            <select value={form.audience} onChange={(e) => setField("audience", e.target.value as AudienceType)}>
              <option value="ALL">All</option>
              <option value="SCHOOL">School</option>
              <option value="UNIVERSITY">University</option>
              <option value="SCHOOL_EGYPTIAN">School - Egyptian</option>
              <option value="SCHOOL_FOREIGN">School - Foreign</option>
            </select>
          </label>

          <label>
            Task Category Tag (optional)
            <select
              value={form.categoryTagId}
              onChange={(e) => {
                setField("categoryTagId", e.target.value);
                if (e.target.value) {
                  setField("categoryTagKey", "");
                  setField("categoryTagLabelEn", "");
                  setField("categoryTagLabelAr", "");
                }
              }}
            >
              <option value="">No category tag</option>
              {categoryTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {(tag.labelEn || tag.label || tag.key)} {tag.labelAr ? `| ${tag.labelAr}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            New Category (EN, optional)
            <input
              value={form.categoryTagLabelEn}
              onChange={(e) => {
                setField("categoryTagLabelEn", e.target.value);
                if (e.target.value.trim()) {
                  setField("categoryTagId", "");
                }
              }}
              placeholder="e.g. Quran"
            />
          </label>

          <label>
            New Category (AR, optional)
            <input
              value={form.categoryTagLabelAr}
              onChange={(e) => {
                setField("categoryTagLabelAr", e.target.value);
                if (e.target.value.trim()) {
                  setField("categoryTagId", "");
                }
              }}
              placeholder="Ù…Ø«Ø§Ù„: Ù‚Ø±Ø¢Ù†"
            />
          </label>

          <label>
            New Category Key (optional)
            <input
              value={form.categoryTagKey}
              onChange={(e) => setField("categoryTagKey", e.target.value)}
              placeholder="quran"
            />
          </label>

          <p className="form-grid__full tasks-section-title">Task Rules</p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.streakEnabled}
              onChange={(e) => setField("streakEnabled", e.target.checked)}
            />
            Streak Enabled
          </label>

          {form.streakEnabled ? (
            <>
              <label>
                Streak goal days
                <input
                  value={form.streakGoalDays}
                  onChange={(e) => setField("streakGoalDays", e.target.value)}
                  type="number"
                  min={1}
                />
              </label>

              <label>
                Streak bonus points
                <input
                  value={form.streakBonusPoints}
                  onChange={(e) => setField("streakBonusPoints", e.target.value)}
                  type="number"
                  step="0.01"
                  min={0}
                />
              </label>

              <label>
                Streak bonus mode
                <select
                  value={form.streakBonusMode}
                  onChange={(e) => setField("streakBonusMode", e.target.value as StreakBonusMode)}
                >
                  <option value="ONE_TIME">Stop after first bonus</option>
                  <option value="RECURRING_SAME">Repeat every same goal days</option>
                  <option value="RECURRING_CUSTOM">Repeat on custom interval</option>
                </select>
              </label>

              {form.streakBonusMode === "RECURRING_CUSTOM" ? (
                <label>
                  Repeat every N days
                  <input
                    value={form.streakRepeatEveryDays}
                    onChange={(e) => setField("streakRepeatEveryDays", e.target.value)}
                    type="number"
                    min={1}
                  />
                </label>
              ) : null}
            </>
          ) : null}

          <label>
            Daily Completion
            <select
              value={form.completionPolicy}
              onChange={(e) => setField("completionPolicy", e.target.value as CompletionPolicy)}
            >
              <option value="SINGLE">Once per day</option>
              <option value="MULTIPLE_LIMITED">Multiple (limited)</option>
              <option value="MULTIPLE_UNLIMITED">Multiple (unlimited)</option>
            </select>
          </label>

          {form.completionPolicy === "MULTIPLE_LIMITED" ? (
            <label>
              Max completions per day
              <input
                value={form.completionLimit}
                onChange={(e) => setField("completionLimit", e.target.value)}
                type="number"
                min={2}
              />
            </label>
          ) : null}

          <label className="checkbox-label">
            <input type="checkbox" checked={form.active} onChange={(e) => setField("active", e.target.checked)} />
            Active
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.enableCounterRule}
              onChange={(e) => setField("enableCounterRule", e.target.checked)}
            />
            Add Counter Rule (optional for any type)
          </label>

          <p className="form-grid__full tasks-section-title">Task Active Window</p>
          <label>
            Active From (optional ISO datetime)
            <input value={form.startsAt} onChange={(e) => setField("startsAt", e.target.value)} />
          </label>

          <label>
            Active Until (optional ISO datetime)
            <input value={form.endsAt} onChange={(e) => setField("endsAt", e.target.value)} />
          </label>

          <label className="form-grid__full">
            Description
            <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} />
          </label>

          {!editingTask ? (
            <label className="form-grid__full">
              Key (optional)
              <input value={form.key} onChange={(e) => setField("key", e.target.value)} />
            </label>
          ) : null}

          <p className="form-grid__full tasks-section-title">Counter Link (Optional)</p>
          {form.enableCounterRule ? (
            <>
              <label>
                Counter
                <select value={form.counterKey} onChange={(e) => setField("counterKey", e.target.value)}>
                  <option value="">Select counter</option>
                  {counters.map((counter) => (
                    <option key={counter.id} value={counter.key}>
                      {counter.name} ({counter.key})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Counter Value Source
                <select
                  value={form.counterValueSource}
                  onChange={(e) => setField("counterValueSource", e.target.value as CounterValueSource)}
                >
                  <option value="ACTIVITY_INPUT">Activity Input</option>
                  <option value="FIXED">Fixed</option>
                </select>
              </label>

              <label>
                Fixed Delta
                <input
                  value={form.counterFixedDelta}
                  onChange={(e) => setField("counterFixedDelta", e.target.value)}
                  type="number"
                  step="0.01"
                  disabled={form.counterValueSource !== "FIXED"}
                />
              </label>
            </>
          ) : null}

          {form.flow === "CONDITIONAL" ? (
            <>
              <p className="form-grid__full tasks-section-title">Conditional Setup</p>
              <label className="form-grid__full">
                Conditional setup mode
                <div className="chip-row tasks-chip-row">
                  <button
                    type="button"
                    className={`chip ${form.conditionalMode === "EXISTING_TASKS" ? "chip--active" : ""}`}
                    onClick={() => setField("conditionalMode", "EXISTING_TASKS")}
                  >
                    Use existing tasks
                  </button>
                  <button
                    type="button"
                    className={`chip ${form.conditionalMode === "NEW_CHILD_TASKS" ? "chip--active" : ""}`}
                    onClick={() => setField("conditionalMode", "NEW_CHILD_TASKS")}
                  >
                    Create child tasks
                  </button>
                </div>
              </label>

              {form.conditionalMode === "EXISTING_TASKS" ? (
                <>
                  <label className="form-grid__full">
                    Child tasks included in this conditional reward
                    <div className="chip-row tasks-chip-row">
                      {tasks
                        .filter((task) => task.id !== editingTaskId && task.type !== "FORBIDDEN")
                        .map((task) => {
                          const checked = form.conditionalChildTaskIds.includes(String(task.id));
                          return (
                            <button
                              key={task.id}
                              type="button"
                              className={`chip ${checked ? "chip--active" : ""}`}
                              onClick={() =>
                                setField(
                                  "conditionalChildTaskIds",
                                  checked
                                    ? form.conditionalChildTaskIds.filter((id) => id !== String(task.id))
                                    : [...form.conditionalChildTaskIds, String(task.id)]
                                )
                              }
                            >
                              {task.title}
                            </button>
                          );
                        })}
                    </div>
                  </label>

                  <label>
                    Child scoring mode
                    <select
                      value={form.conditionalScoringMode}
                      onChange={(e) => setField("conditionalScoringMode", e.target.value as ConditionalScoringMode)}
                    >
                      <option value="TIER">Tier rewards</option>
                      <option value="PERCENT_PER_CHILD">Percent of task points per child</option>
                      <option value="POINTS_PER_CHILD">Fixed points per child (capped)</option>
                    </select>
                  </label>

                  {form.conditionalScoringMode === "PERCENT_PER_CHILD" ? (
                    <label>
                      Percent per child
                      <input
                        value={form.conditionalPerChildPercent}
                        onChange={(e) => setField("conditionalPerChildPercent", e.target.value)}
                        type="number"
                        step="0.01"
                        min={0}
                      />
                    </label>
                  ) : null}

                  {form.conditionalScoringMode === "POINTS_PER_CHILD" ? (
                    <label>
                      Points per child
                      <input
                        value={form.conditionalPerChildPoints}
                        onChange={(e) => setField("conditionalPerChildPoints", e.target.value)}
                        type="number"
                        step="0.01"
                        min={0}
                      />
                    </label>
                  ) : null}

                  {form.conditionalScoringMode === "TIER" ? (
                    <>
                      <label>
                        Partial reward points (optional)
                        <input
                          value={form.conditionalPartialPoints}
                          onChange={(e) => setField("conditionalPartialPoints", e.target.value)}
                          type="number"
                          step="0.01"
                          min={0}
                        />
                      </label>

                      <label>
                        Partial reward method
                        <select
                          value={form.conditionalPartialMode}
                          onChange={(e) => setField("conditionalPartialMode", e.target.value as PartialRewardMode)}
                        >
                          <option value="BY_COUNT">By completed number</option>
                          <option value="BY_TASKS">By specific task names</option>
                        </select>
                      </label>

                      {form.conditionalPartialMode === "BY_COUNT" ? (
                        <label>
                          Partial reward count
                          <input
                            value={form.conditionalPartialCount}
                            onChange={(e) => setField("conditionalPartialCount", e.target.value)}
                            type="number"
                            min={1}
                          />
                        </label>
                      ) : (
                        <label className="form-grid__full">
                          Partial reward task names
                          <div className="chip-row tasks-chip-row">
                            {form.conditionalChildTaskIds.map((taskId) => {
                              const childTask = tasks.find((task) => String(task.id) === taskId);
                              if (!childTask) {
                                return null;
                              }
                              const checked = form.conditionalPartialRequiredTaskIds.includes(taskId);
                              return (
                                <button
                                  key={`partial-${taskId}`}
                                  type="button"
                                  className={`chip ${checked ? "chip--active" : ""}`}
                                  onClick={() =>
                                    setField(
                                      "conditionalPartialRequiredTaskIds",
                                      checked
                                        ? form.conditionalPartialRequiredTaskIds.filter((id) => id !== taskId)
                                        : [...form.conditionalPartialRequiredTaskIds, taskId]
                                    )
                                  }
                                >
                                  {childTask.title}
                                </button>
                              );
                            })}
                          </div>
                        </label>
                      )}

                      <label>
                        Full reward points (all child tasks)
                        <input
                          value={form.conditionalFullPoints}
                          onChange={(e) => setField("conditionalFullPoints", e.target.value)}
                          type="number"
                          step="0.01"
                          min={0}
                        />
                      </label>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <label className="form-grid__full">
                    Add child task name (same for Arabic + English)
                    <div className="inline-form">
                      <input
                        value={newInlineTaskName}
                        onChange={(e) => setNewInlineTaskName(e.target.value)}
                        placeholder="e.g. Read one hizb"
                      />
                      <button type="button" onClick={addInlineTask}>
                        Add child task
                      </button>
                    </div>
                  </label>

                  <label className="form-grid__full">
                    Child tasks under this conditional task
                    <div className="chip-row tasks-chip-row">
                      {form.conditionalInlineTasks.map((item) => (
                        <button
                          key={`inline-${item.key}`}
                          type="button"
                          className="chip chip--active"
                          onClick={() => removeInlineTask(item.key)}
                          title="Click to remove"
                        >
                          {item.titleEn || item.key}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label>
                    Child scoring mode
                    <select
                      value={form.conditionalScoringMode}
                      onChange={(e) => setField("conditionalScoringMode", e.target.value as ConditionalScoringMode)}
                    >
                      <option value="TIER">Tier rewards</option>
                      <option value="PERCENT_PER_CHILD">Percent of task points per child</option>
                      <option value="POINTS_PER_CHILD">Fixed points per child (capped)</option>
                    </select>
                  </label>

                  {form.conditionalScoringMode === "PERCENT_PER_CHILD" ? (
                    <label>
                      Percent per child
                      <input
                        value={form.conditionalPerChildPercent}
                        onChange={(e) => setField("conditionalPerChildPercent", e.target.value)}
                        type="number"
                        step="0.01"
                        min={0}
                      />
                    </label>
                  ) : null}

                  {form.conditionalScoringMode === "POINTS_PER_CHILD" ? (
                    <label>
                      Points per child
                      <input
                        value={form.conditionalPerChildPoints}
                        onChange={(e) => setField("conditionalPerChildPoints", e.target.value)}
                        type="number"
                        step="0.01"
                        min={0}
                      />
                    </label>
                  ) : null}

                  {form.conditionalScoringMode === "TIER" ? (
                    <>
                      <label>
                        Partial reward points (optional)
                        <input
                          value={form.conditionalInlinePartialPoints}
                          onChange={(e) => setField("conditionalInlinePartialPoints", e.target.value)}
                          type="number"
                          step="0.01"
                          min={0}
                        />
                      </label>

                      <label>
                        Partial reward method
                        <select
                          value={form.conditionalInlinePartialMode}
                          onChange={(e) => setField("conditionalInlinePartialMode", e.target.value as PartialRewardMode)}
                        >
                          <option value="BY_COUNT">By completed number</option>
                          <option value="BY_TASKS">By specific task names</option>
                        </select>
                      </label>

                      {form.conditionalInlinePartialMode === "BY_COUNT" ? (
                        <label>
                          Partial reward count
                          <input
                            value={form.conditionalInlinePartialCount}
                            onChange={(e) => setField("conditionalInlinePartialCount", e.target.value)}
                            type="number"
                            min={1}
                          />
                        </label>
                      ) : (
                        <label className="form-grid__full">
                          Partial reward task names
                          <div className="chip-row tasks-chip-row">
                            {form.conditionalInlineTasks.map((item) => {
                              const checked = form.conditionalInlinePartialRequiredKeys.includes(item.key);
                              return (
                                <button
                                  key={`inline-required-${item.key}`}
                                  type="button"
                                  className={`chip ${checked ? "chip--active" : ""}`}
                                  onClick={() =>
                                    setField(
                                      "conditionalInlinePartialRequiredKeys",
                                      checked
                                        ? form.conditionalInlinePartialRequiredKeys.filter((key) => key !== item.key)
                                        : [...form.conditionalInlinePartialRequiredKeys, item.key]
                                    )
                                  }
                                >
                                  {item.titleEn || item.key}
                                </button>
                              );
                            })}
                          </div>
                        </label>
                      )}

                      <label>
                        Full reward points (all child tasks)
                        <input
                          value={form.conditionalInlineFullPoints}
                          onChange={(e) => setField("conditionalInlineFullPoints", e.target.value)}
                          type="number"
                          step="0.01"
                          min={0}
                        />
                      </label>
                    </>
                  ) : null}
                </>
              )}

              <label className="checkbox-label form-grid__full">
                <input
                  type="checkbox"
                  checked={form.conditionEnabled}
                  onChange={(e) => setField("conditionEnabled", e.target.checked)}
                />
                Enable additional simple condition
              </label>

              {form.conditionEnabled ? (
                <>
                  <label>
                    Target Task (optional)
                    <select
                      value={form.conditionTargetTaskId}
                      onChange={(e) => setField("conditionTargetTaskId", e.target.value)}
                    >
                      <option value="">None</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title} ({task.id})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Required Value
                    <input
                      value={form.conditionValue}
                      onChange={(e) => setField("conditionValue", e.target.value)}
                      type="number"
                      step="0.01"
                    />
                  </label>
                </>
              ) : null}
            </>
          ) : null}

          {error ? <p className="error-text form-grid__full">{error}</p> : null}
          {success ? <p className="success-text form-grid__full">{success}</p> : null}

          <div className="form-grid__full inline-form">
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : editingTask ? "Save Changes" : "Create Task"}
            </button>
            {editingTask ? (
              <button type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </PanelCard>

      <PanelCard title="Created Tasks">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Visibility</th>
                <th>Flow</th>
                <th>Audience</th>
                <th>Category</th>
                <th>Daily Completion</th>
                <th>Streak</th>
                <th>Points</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.id}</td>
                  <td>{task.title}</td>
                  <td>{task.type === "FORBIDDEN" ? "Forbidden" : "Normal"}</td>
                  <td>{flowFromTask(task)}</td>
                  <td>{audienceLabel(audienceFromTask(task))}</td>
                  <td>{task.categoryTag?.labelEn || task.categoryTag?.label || "-"}</td>
                  <td>{completionPolicyLabel(task)}</td>
                  <td>{isStreakEnabled(task) ? "Yes" : "No"}</td>
                  <td>{String(task.basePoints)}</td>
                  <td>{task.status}</td>
                  <td>
                    <div className="inline-form">
                      <button type="button" onClick={() => fillFormFromTask(task)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => void removeTask(task)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}






