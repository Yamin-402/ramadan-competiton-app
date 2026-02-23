import { FormEvent, useMemo, useState } from "react";
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
  conditionalChildTaskIds: string[];
  conditionalPartialCount: string;
  conditionalPartialPoints: string;
  conditionalPartialRequiredTaskIds: string[];
  conditionalFullPoints: string;
  conditionalInlineTasks: Array<{
    key: string;
    titleEn: string;
    titleAr: string;
  }>;
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
  conditionalChildTaskIds: [],
  conditionalPartialCount: "",
  conditionalPartialPoints: "",
  conditionalPartialRequiredTaskIds: [],
  conditionalFullPoints: "",
  conditionalInlineTasks: [],
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

export function TasksModule({ tasks, counters, tags, onRefreshReferences }: TasksModuleProps) {
  const [form, setForm] = useState<TaskFormState>(defaultForm);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newInlineTaskEn, setNewInlineTaskEn] = useState("");
  const [newInlineTaskAr, setNewInlineTaskAr] = useState("");

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

  const fillFormFromTask = (task: AdminTask) => {
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
      conditionalChildTaskIds: Array.isArray(task.config?.conditionalChildTaskIds)
        ? task.config.conditionalChildTaskIds.map((value) => String(value))
        : [],
      conditionalPartialCount: Array.isArray(task.config?.conditionalRewardTiers)
        ? String(
            task.config.conditionalRewardTiers
              .map((tier) => Number((tier as { requiredCount?: unknown }).requiredCount))
              .filter((value) => Number.isFinite(value))
              .sort((a, b) => a - b)[0] || ""
          )
        : "",
      conditionalPartialPoints: Array.isArray(task.config?.conditionalRewardTiers)
        ? String(
            task.config.conditionalRewardTiers
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
              .sort((a, b) => a.requiredCount - b.requiredCount)[0]?.points ?? ""
          )
        : "",
      conditionalPartialRequiredTaskIds: Array.isArray(task.config?.conditionalRewardTiers)
        ? (() => {
            const firstTier = task.config.conditionalRewardTiers
              .map((tier) => ({
                requiredCount: Number((tier as { requiredCount?: unknown }).requiredCount),
                requiredTaskIds: Array.isArray((tier as { requiredTaskIds?: unknown }).requiredTaskIds)
                  ? (tier as { requiredTaskIds?: unknown[] }).requiredTaskIds
                      ?.map((value) => String(value))
                      .filter(Boolean) || []
                  : [],
              }))
              .filter((tier) => Number.isFinite(tier.requiredCount))
              .sort((a, b) => a.requiredCount - b.requiredCount)[0];
            return firstTier?.requiredTaskIds || [];
          })()
        : [],
      conditionalFullPoints: Array.isArray(task.config?.conditionalRewardTiers)
        ? String(
            task.config.conditionalRewardTiers
              .map((tier) => Number((tier as { points?: unknown }).points))
              .filter((value) => Number.isFinite(value))
              .sort((a, b) => b - a)[0] ?? ""
          )
        : "",
      conditionalInlineTasks: Array.isArray(task.config?.conditionalInlineTasks)
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
              return {
                key: keyRaw,
                titleEn,
                titleAr,
              };
            })
            .filter(Boolean) as Array<{ key: string; titleEn: string; titleAr: string }>
        : [],
      conditionalInlinePartialCount: Array.isArray(task.config?.conditionalInlineRewardTiers)
        ? String(
            task.config.conditionalInlineRewardTiers
              .map((tier) => Number((tier as { requiredCount?: unknown }).requiredCount))
              .filter((value) => Number.isFinite(value))
              .sort((a, b) => a - b)[0] || ""
          )
        : "",
      conditionalInlinePartialPoints: Array.isArray(task.config?.conditionalInlineRewardTiers)
        ? String(
            task.config.conditionalInlineRewardTiers
              .map((tier) => ({
                requiredCount: Number((tier as { requiredCount?: unknown }).requiredCount),
                points: Number((tier as { points?: unknown }).points),
                requiredInlineTaskKeys: Array.isArray((tier as { requiredInlineTaskKeys?: unknown }).requiredInlineTaskKeys)
                  ? (tier as { requiredInlineTaskKeys?: unknown[] }).requiredInlineTaskKeys
                      ?.map((value) => String(value))
                      .filter(Boolean) || []
                  : [],
              }))
              .filter((tier) => Number.isFinite(tier.requiredCount) && Number.isFinite(tier.points))
              .sort((a, b) => a.requiredCount - b.requiredCount)[0]?.points ?? ""
          )
        : "",
      conditionalInlinePartialRequiredKeys: Array.isArray(task.config?.conditionalInlineRewardTiers)
        ? (() => {
            const firstTier = task.config.conditionalInlineRewardTiers
              .map((tier) => ({
                requiredCount: Number((tier as { requiredCount?: unknown }).requiredCount),
                requiredInlineTaskKeys: Array.isArray((tier as { requiredInlineTaskKeys?: unknown }).requiredInlineTaskKeys)
                  ? (tier as { requiredInlineTaskKeys?: unknown[] }).requiredInlineTaskKeys
                      ?.map((value) => String(value))
                      .filter(Boolean) || []
                  : [],
              }))
              .filter((tier) => Number.isFinite(tier.requiredCount))
              .sort((a, b) => a.requiredCount - b.requiredCount)[0];
            return firstTier?.requiredInlineTaskKeys || [];
          })()
        : [],
      conditionalInlineFullPoints: Array.isArray(task.config?.conditionalInlineRewardTiers)
        ? String(
            task.config.conditionalInlineRewardTiers
              .map((tier) => Number((tier as { points?: unknown }).points))
              .filter((value) => Number.isFinite(value))
              .sort((a, b) => b - a)[0] ?? ""
          )
        : "",
    });
    setEditingTaskId(task.id);
    setError(null);
    setSuccess(null);
  };

  const resetForm = () => {
    setForm(defaultForm);
    setNewInlineTaskEn("");
    setNewInlineTaskAr("");
    setEditingTaskId(null);
  };

  const addInlineTask = () => {
    const titleEn = newInlineTaskEn.trim();
    const titleAr = newInlineTaskAr.trim();
    if (!titleEn && !titleAr) {
      return;
    }

    const keySeed = titleEn || titleAr;
    const key = normalizeCategoryTagKey(keySeed);
    if (form.conditionalInlineTasks.some((item) => item.key === key)) {
      setError("Inline task key already exists. Change the task title.");
      return;
    }

    setField("conditionalInlineTasks", [
      ...form.conditionalInlineTasks,
      {
        key,
        titleEn,
        titleAr,
      },
    ]);
    setNewInlineTaskEn("");
    setNewInlineTaskAr("");
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

      if (form.flow === "CONDITIONAL" && form.conditionalChildTaskIds.length > 0) {
        if (!form.conditionalFullPoints || Number(form.conditionalFullPoints) <= 0) {
          throw new Error("Conditional full points must be greater than 0.");
        }
      }

      if (form.flow === "CONDITIONAL" && form.conditionalInlineTasks.length > 0) {
        if (!form.conditionalInlineFullPoints || Number(form.conditionalInlineFullPoints) <= 0) {
          throw new Error("Inline minor-task full points must be greater than 0.");
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
        conditionalChildTaskIds:
          form.flow === "CONDITIONAL"
            ? form.conditionalChildTaskIds
                .map((value) => Number(value))
                .filter((value) => Number.isInteger(value) && value > 0)
            : [],
        conditionalRewardTiers:
          form.flow === "CONDITIONAL"
            ? [
                ...(form.conditionalPartialCount && form.conditionalPartialPoints
                  ? [
                      {
                        requiredCount: Number(form.conditionalPartialCount),
                        points: Number(form.conditionalPartialPoints),
                        requiredTaskIds: form.conditionalPartialRequiredTaskIds
                          .map((value) => Number(value))
                          .filter((value) => Number.isInteger(value) && value > 0),
                      },
                    ]
                  : []),
                ...(form.conditionalChildTaskIds.length > 0 && form.conditionalFullPoints
                  ? [
                      {
                        requiredCount: form.conditionalChildTaskIds.length,
                        points: Number(form.conditionalFullPoints),
                      },
                    ]
                  : []),
              ]
            : [],
        conditionalInlineTasks:
          form.flow === "CONDITIONAL"
            ? form.conditionalInlineTasks.map((item) => ({
                key: item.key,
                titleEn: item.titleEn,
                titleAr: item.titleAr,
              }))
            : [],
        conditionalInlineRewardTiers:
          form.flow === "CONDITIONAL"
            ? [
                ...(form.conditionalInlinePartialCount && form.conditionalInlinePartialPoints
                  ? [
                      {
                        requiredCount: Number(form.conditionalInlinePartialCount),
                        points: Number(form.conditionalInlinePartialPoints),
                        requiredInlineTaskKeys: form.conditionalInlinePartialRequiredKeys,
                      },
                    ]
                  : []),
                ...(form.conditionalInlineTasks.length > 0 && form.conditionalInlineFullPoints
                  ? [
                      {
                        requiredCount: form.conditionalInlineTasks.length,
                        points: Number(form.conditionalInlineFullPoints),
                      },
                    ]
                  : []),
              ]
            : [],
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

  return (
    <div className="stack">
      <PanelCard title={editingTask ? `Edit Task: ${editingTask.title}` : "Create Task"}>
        <form className="form-grid" onSubmit={submit}>
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
            Task Flow Type
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
              placeholder="مثال: قرآن"
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

          <label>
            Start At (ISO, optional)
            <input value={form.startsAt} onChange={(e) => setField("startsAt", e.target.value)} />
          </label>

          <label>
            End At (ISO, optional)
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
              <label className="form-grid__full">
                Child tasks included in this conditional reward
                <div className="chip-row">
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
                Partial reward count (optional)
                <input
                  value={form.conditionalPartialCount}
                  onChange={(e) => setField("conditionalPartialCount", e.target.value)}
                  type="number"
                  min={1}
                />
              </label>

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

              <label className="form-grid__full">
                Partial reward requires specific child tasks (optional)
                <div className="chip-row">
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

              <label className="form-grid__full">
                Inline minor tasks (shown under this parent task only)
                <div className="inline-grid">
                  <div className="form-grid">
                    <label>
                      Minor task (EN)
                      <input
                        value={newInlineTaskEn}
                        onChange={(e) => setNewInlineTaskEn(e.target.value)}
                        placeholder="e.g. Read one hizb"
                      />
                    </label>
                    <label>
                      Minor task (AR)
                      <input
                        value={newInlineTaskAr}
                        onChange={(e) => setNewInlineTaskAr(e.target.value)}
                        placeholder="مثال: قراءة جزء"
                      />
                    </label>
                  </div>
                  <div className="inline-form">
                    <button type="button" onClick={addInlineTask}>
                      Add minor task
                    </button>
                  </div>
                  <div className="chip-row">
                    {form.conditionalInlineTasks.map((item) => (
                      <button
                        key={`inline-${item.key}`}
                        type="button"
                        className="chip chip--active"
                        onClick={() => removeInlineTask(item.key)}
                        title="Click to remove"
                      >
                        {(item.titleEn || item.titleAr || item.key)} {item.titleAr && item.titleEn ? `| ${item.titleAr}` : ""}
                      </button>
                    ))}
                  </div>
                </div>
              </label>

              {form.conditionalInlineTasks.length > 0 ? (
                <>
                  <label>
                    Inline partial reward count (optional)
                    <input
                      value={form.conditionalInlinePartialCount}
                      onChange={(e) => setField("conditionalInlinePartialCount", e.target.value)}
                      type="number"
                      min={1}
                    />
                  </label>

                  <label>
                    Inline partial reward points (optional)
                    <input
                      value={form.conditionalInlinePartialPoints}
                      onChange={(e) => setField("conditionalInlinePartialPoints", e.target.value)}
                      type="number"
                      step="0.01"
                      min={0}
                    />
                  </label>

                  <label className="form-grid__full">
                    Inline partial reward requires specific minor tasks (optional)
                    <div className="chip-row">
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
                            {item.titleEn || item.titleAr || item.key}
                          </button>
                        );
                      })}
                    </div>
                  </label>

                  <label>
                    Inline full reward points (all minor tasks)
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

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.conditionEnabled}
                  onChange={(e) => setField("conditionEnabled", e.target.checked)}
                />
                Enable Simple Condition
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
