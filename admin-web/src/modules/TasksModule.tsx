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

interface TaskFormState {
  title: string;
  points: string;
  description: string;
  key: string;
  visibility: VisibilityType;
  flow: FlowType;
  audience: AudienceType;
  streakEnabled: boolean;
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
}

const defaultForm: TaskFormState = {
  title: "",
  points: "0",
  description: "",
  key: "",
  visibility: "NORMAL",
  flow: "NORMAL",
  audience: "ALL",
  streakEnabled: false,
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
};

function normalizeKey(text: string): string {
  const normalized = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || `task_${Date.now()}`;
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

export function TasksModule({ tasks, counters, tags, onRefreshReferences }: TasksModuleProps) {
  const [form, setForm] = useState<TaskFormState>(defaultForm);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => b.id - a.id), [tasks]);
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
      streakEnabled: isStreakEnabled(task),
      completionPolicy: completionPolicyFromTask(task),
      completionLimit: completionLimitFromTask(task),
      active: task.status === "ACTIVE",
      startsAt: task.startsAt ? new Date(task.startsAt).toISOString() : "",
      endsAt: task.endsAt ? new Date(task.endsAt).toISOString() : "",
    });
    setEditingTaskId(task.id);
    setError(null);
    setSuccess(null);
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingTaskId(null);
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

      if (form.completionPolicy === "MULTIPLE_LIMITED") {
        const limit = Number(form.completionLimit);
        if (!Number.isFinite(limit) || limit < 2) {
          throw new Error("Daily completion limit must be 2 or more.");
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
      const config = {
        taskVisibility: form.visibility,
        taskFlowType: form.flow,
        streakEnabled: form.streakEnabled,
        audience: form.audience,
        completionPolicy: form.completionPolicy,
        allowMultipleCompletionsPerCompetitionDay: form.completionPolicy !== "SINGLE",
        maxCompletionsPerCompetitionDay:
          form.completionPolicy === "MULTIPLE_LIMITED"
            ? Number(form.completionLimit)
            : null,
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
        requiredTagKeys: audienceTagKeys,
      };

      if (editingTaskId) {
        await adminApi.updateTask(editingTaskId, {
          ...payload,
          description: form.description.trim() || null,
          startsAt: form.startsAt.trim() || null,
          endsAt: form.endsAt.trim() || null,
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

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.streakEnabled}
              onChange={(e) => setField("streakEnabled", e.target.checked)}
            />
            Streak Enabled
          </label>

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
