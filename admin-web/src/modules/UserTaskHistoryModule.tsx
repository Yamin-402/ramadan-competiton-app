import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import { AdminUser, AdminUserActivity } from "../types";

interface UserTaskHistoryModuleProps {
  users: AdminUser[];
  initialUserId: number | null;
}

interface DayGroup {
  key: string;
  ramadanDay: number;
  items: AdminUserActivity[];
  dayPoints: number;
}

function toNumber(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getCairoDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getCompetitionDayKey(row: AdminUserActivity): string {
  if (row.competitionDate) {
    return row.competitionDate;
  }
  return getCairoDayKey(new Date(row.occurredAt));
}

function getCairoTimeLabel(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getRamadanDayByCompetitionDate(competitionDate: string): number {
  const startUtc = Date.UTC(2026, 1, 19);
  const normalized = competitionDate.includes("T") ? competitionDate : `${competitionDate}T12:00:00.000Z`;
  const date = new Date(normalized);
  const currentUtc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const diffDays = Math.floor((currentUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1;
  return diffDays > 0 ? diffDays : 0;
}

function getDayLabel(day: DayGroup): string {
  if (day.ramadanDay > 0) {
    return `Day ${day.ramadanDay} of Ramadan`;
  }

  return `Date ${day.key}`;
}

function formatSignedPoints(value: number | string): string {
  const points = toNumber(value);
  if (points > 0) {
    return `+${points.toFixed(2)}`;
  }
  if (points < 0) {
    return `-${Math.abs(points).toFixed(2)}`;
  }
  return "0.00";
}

function getActivityMetadata(item: AdminUserActivity): Record<string, unknown> | null {
  if (!item.metadata || typeof item.metadata !== "object" || Array.isArray(item.metadata)) {
    return null;
  }

  return item.metadata as Record<string, unknown>;
}

function getTaskSnapshot(item: AdminUserActivity) {
  const metadata = getActivityMetadata(item);
  const snapshotRaw = metadata?.taskSnapshot;
  const snapshot =
    snapshotRaw && typeof snapshotRaw === "object" && !Array.isArray(snapshotRaw)
      ? (snapshotRaw as Record<string, unknown>)
      : null;

  const flowTypeFromTask =
    item.task?.config && typeof item.task.config === "object"
      ? String((item.task.config as Record<string, unknown>).taskFlowType || "").toUpperCase()
      : "";
  const flowTypeFromSnapshot =
    snapshot && typeof snapshot.flowType === "string" ? snapshot.flowType.trim().toUpperCase() : "";

  return {
    title:
      (snapshot && typeof snapshot.title === "string" ? snapshot.title : null) ||
      item.task?.title ||
      null,
    type:
      (snapshot && typeof snapshot.type === "string" ? snapshot.type.trim().toUpperCase() : null) ||
      item.task?.type ||
      null,
    flowType: flowTypeFromSnapshot || flowTypeFromTask || "",
    basePoints:
      (snapshot && Number.isFinite(Number(snapshot.basePoints)) ? Number(snapshot.basePoints) : null) ||
      Number(item.task?.basePoints),
  };
}

function getActivityTitle(item: AdminUserActivity): string {
  if (item.type === "DAILY_QUESTION_ANSWER") {
    return "Daily question";
  }
  if (item.type === "MANUAL_ADJUSTMENT") {
    return "Manual points adjustment";
  }

  return getTaskSnapshot(item).title || item.type;
}

function getTaskTypeLabel(item: AdminUserActivity): string {
  if (item.type === "DAILY_QUESTION_ANSWER") {
    return "Daily question";
  }
  if (item.type === "MANUAL_ADJUSTMENT") {
    return "Manual adjustment";
  }

  const flowType = getTaskSnapshot(item).flowType;
  if (flowType === "TIMED") {
    return "Timed";
  }

  const type = getTaskSnapshot(item).type || "NORMAL";
  if (type === "COUNTER") {
    return "Numeric";
  }
  if (type === "CONDITIONAL") {
    return "Conditional";
  }
  if (type === "FORBIDDEN") {
    return "Forbidden";
  }
  if (type === "STREAK") {
    return "Streak";
  }
  return "Normal";
}

function getTaskFlowType(item: AdminUserActivity): string {
  return getTaskSnapshot(item).flowType;
}

function resolveEnteredAmount(item: AdminUserActivity): number | null {
  const snapshot = getTaskSnapshot(item);
  const flowType = snapshot.flowType;
  const isAmountTask =
    flowType === "TIMED" || flowType === "COUNTER" || snapshot.type === "COUNTER";
  if (!isAmountTask) {
    return null;
  }

  const metadata = getActivityMetadata(item);
  if (!metadata) {
    return null;
  }

  const directAmount = Number(metadata.activityAmount);
  if (Number.isFinite(directAmount)) {
    return directAmount;
  }

  const pointUnits = Number(metadata.pointUnits);
  if (Number.isFinite(pointUnits)) {
    if (flowType === "TIMED") {
      return pointUnits * 60;
    }

    return pointUnits;
  }

  const effectiveBasePoints = Math.abs(toNumber(item.basePoints));
  const taskBasePoints = Math.abs(Number(snapshot.basePoints));
  if (Number.isFinite(taskBasePoints) && taskBasePoints > 0 && Number.isFinite(effectiveBasePoints)) {
    const units = effectiveBasePoints / taskBasePoints;
    if (Number.isFinite(units) && units > 0) {
      if (snapshot.flowType === "TIMED") {
        return units * 60;
      }
      return units;
    }
  }

  return null;
}

function formatAmountCell(item: AdminUserActivity): string {
  const snapshot = getTaskSnapshot(item);
  const flowType = getTaskFlowType(item);
  const isAmountTask =
    flowType === "TIMED" || flowType === "COUNTER" || snapshot.type === "COUNTER";
  if (!isAmountTask) {
    return "-";
  }

  const enteredAmount = resolveEnteredAmount(item);

  if (enteredAmount !== null && Number.isFinite(enteredAmount)) {
    if (flowType === "TIMED") {
      return `${toNumber(enteredAmount).toFixed(0)} min`;
    }
    return toNumber(enteredAmount).toFixed(2);
  }

  if (item.counterDeltas.length > 0) {
    return item.counterDeltas
      .map(
        (delta) =>
          `${delta.counter.name}: ${toNumber(delta.delta).toFixed(2)}${delta.counter.unit ? ` ${delta.counter.unit}` : ""}`
      )
      .join(" | ");
  }

  return "-";
}

function getInlineTaskLabelFromConfig(item: AdminUserActivity, key: string): string | null {
  const config = item.task?.config;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  const raw = (config as Record<string, unknown>).conditionalInlineTasks;
  if (!Array.isArray(raw)) {
    return null;
  }

  const wanted = String(key || "").trim().toLowerCase();
  const matched = raw.find((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return false;
    }
    const row = entry as Record<string, unknown>;
    return String(row.key || "").trim().toLowerCase() === wanted;
  });

  if (!matched || typeof matched !== "object" || Array.isArray(matched)) {
    return null;
  }

  const row = matched as Record<string, unknown>;
  const titleEn = String(row.titleEn || "").trim();
  const titleAr = String(row.titleAr || "").trim();
  return titleEn || titleAr || null;
}

function getDetailsCell(item: AdminUserActivity): string {
  const metadata = getActivityMetadata(item);
  if (!metadata) {
    return item.note || "-";
  }

  if (item.type === "MANUAL_ADJUSTMENT") {
    return item.note || "Manual admin adjustment";
  }

  if (item.type === "DAILY_QUESTION_ANSWER") {
    const answerType =
      typeof metadata.answerType === "string" && metadata.answerType.trim().length > 0
        ? metadata.answerType
        : "Unknown";
    const correctness =
      metadata.isCorrect === true
        ? "Correct"
        : metadata.isCorrect === false
          ? "Wrong"
          : "Pending";

    const label = `Daily question (${answerType}) - ${correctness}`;
    return item.note ? `${label} | Note: ${item.note}` : label;
  }

  if (item.type === "TASK_COMPLETION" && getTaskSnapshot(item).type === "CONDITIONAL") {
    const rawInlineTasks = metadata.selectedInlineTasks;
    if (Array.isArray(rawInlineTasks)) {
      const labels = rawInlineTasks
        .map((row) => {
          if (!row || typeof row !== "object" || Array.isArray(row)) {
            return null;
          }

          const value = row as Record<string, unknown>;
          const label = String(value.titleEn || value.titleAr || value.key || "").trim();
          return label || null;
        })
        .filter((label): label is string => Boolean(label));

      if (labels.length > 0) {
        return `Minor tasks: ${labels.join(" | ")}`;
      }
    }

    const rawKeys = metadata.selectedInlineTaskKeys;
    if (Array.isArray(rawKeys) && rawKeys.length > 0) {
      const labels = rawKeys
        .map((value) => String(value).trim())
        .filter(Boolean)
        .map((key) => getInlineTaskLabelFromConfig(item, key) || key.replace(/[_-]+/g, " ").trim() || key);
      return `Minor tasks: ${labels.join(" | ")}`;
    }
  }

  return item.note || "-";
}

export function UserTaskHistoryModule({ users, initialUserId }: UserTaskHistoryModuleProps) {
  const initialPointsBaseline = 100;
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId ? String(initialUserId) : "");
  const [rows, setRows] = useState<AdminUserActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedByDay, setExpandedByDay] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(String(initialUserId));
    }
  }, [initialUserId]);

  const selectedUserLabel = useMemo(() => {
    if (!selectedUserId) {
      return "";
    }
    const user = users.find((item) => item.id === Number(selectedUserId));
    return user ? user.displayName || user.email : "";
  }, [selectedUserId, users]);

  const loadHistory = async (userId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listUserActivities(userId, { limit: 500 });
      setRows(data);
      const firstActivity = data[0];
      if (firstActivity) {
        const firstDayKey = getCompetitionDayKey(firstActivity);
        setExpandedByDay({ [firstDayKey]: true });
      } else {
        setExpandedByDay({});
      }
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not load user task history"));
      setRows([]);
      setExpandedByDay({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      void loadHistory(Number(selectedUserId));
    } else {
      setRows([]);
      setExpandedByDay({});
    }
  }, [selectedUserId]);

  const groupedDays = useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();

    for (const row of rows) {
      const dayKey = getCompetitionDayKey(row);
      const existing = map.get(dayKey);

      if (!existing) {
        map.set(dayKey, {
          key: dayKey,
          ramadanDay: getRamadanDayByCompetitionDate(dayKey),
          items: [row],
          dayPoints: toNumber(row.effectivePoints),
        });
        continue;
      }

      existing.items.push(row);
      existing.dayPoints += toNumber(row.effectivePoints);
    }

    return Array.from(map.values())
      .map((day) => ({
        ...day,
        items: day.items.sort(
          (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
        ),
      }))
      .sort((left, right) => right.key.localeCompare(left.key));
  }, [rows]);

  const overallPoints = useMemo(
    () => initialPointsBaseline + rows.reduce((sum, row) => sum + toNumber(row.effectivePoints), 0),
    [initialPointsBaseline, rows]
  );
  const pointsGained = useMemo(
    () =>
      rows
        .map((row) => toNumber(row.effectivePoints))
        .filter((value) => value > 0)
        .reduce((sum, value) => sum + value, initialPointsBaseline),
    [initialPointsBaseline, rows]
  );
  const pointsLost = useMemo(
    () =>
      rows
        .map((row) => toNumber(row.effectivePoints))
        .filter((value) => value < 0)
        .reduce((sum, value) => sum + Math.abs(value), 0),
    [rows]
  );

  const toggleDay = (key: string) => {
    setExpandedByDay((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="stack user-history-page">
      <PanelCard title="User Task History">
        <div className="inline-form user-history-toolbar">
          <label>
            User
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName || user.email}
                </option>
              ))}
            </select>
          </label>
          <button
            className="user-history-refresh-btn"
            type="button"
            disabled={!selectedUserId || loading}
            onClick={() => void loadHistory(Number(selectedUserId))}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {selectedUserLabel ? <p className="muted-text user-history-meta">Current user: {selectedUserLabel}</p> : null}
        <p className="muted-text user-history-meta">
          Forbidden activities are hidden for admin.
        </p>

        {error ? <p className="error-text">{error}</p> : null}
      </PanelCard>

      {!selectedUserId ? (
        <PanelCard title="History">
          <p className="muted-text">Select a user to view task history.</p>
        </PanelCard>
      ) : loading ? (
        <PanelCard title="History">
          <p className="muted-text">Loading user history...</p>
        </PanelCard>
      ) : groupedDays.length === 0 ? (
        <PanelCard title="History">
          <p className="muted-text">No task history for this user.</p>
        </PanelCard>
      ) : (
        <>
          <PanelCard title="Summary">
            <div className="inline-grid user-history-summary">
              <p className="muted-text user-history-summary-line">
                Latest day total: {groupedDays[0]?.dayPoints.toFixed(2) || "0.00"} points
              </p>
              <p className="muted-text user-history-summary-line">Overall total: {overallPoints.toFixed(2)} points</p>
              <p className="muted-text user-history-summary-line">Points gained: {pointsGained.toFixed(2)}</p>
              <p className="muted-text user-history-summary-line">Points lost: {pointsLost.toFixed(2)}</p>
            </div>
          </PanelCard>

          {groupedDays.map((day) => {
            const isExpanded = expandedByDay[day.key] || false;
            const dayPointsGained = day.items
              .map((item) => toNumber(item.effectivePoints))
              .filter((value) => value > 0)
              .reduce((sum, value) => sum + value, 0);
            const dayPointsLost = day.items
              .map((item) => toNumber(item.effectivePoints))
              .filter((value) => value < 0)
              .reduce((sum, value) => sum + Math.abs(value), 0);

            return (
              <PanelCard key={day.key}>
                <div className="user-history-day-header">
                  <div className="user-history-day-info">
                    <strong className="user-history-day-title">{getDayLabel(day)}</strong>
                    <p className="muted-text user-history-day-meta">
                      Activities: {day.items.length} | Day points: {day.dayPoints.toFixed(2)}
                    </p>
                  </div>
                  <button className="user-history-expand-btn" type="button" onClick={() => toggleDay(day.key)}>
                    {isExpanded ? "Collapse" : "Expand"}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="stack user-history-day-content">
                    <div className="inline-grid user-history-summary">
                      <p className="muted-text user-history-summary-line">
                        Day total: {day.dayPoints.toFixed(2)}
                      </p>
                      <p className="muted-text user-history-summary-line">
                        Points gained: {dayPointsGained.toFixed(2)}
                      </p>
                      <p className="muted-text user-history-summary-line">
                        Points lost: {dayPointsLost.toFixed(2)}
                      </p>
                    </div>
                    <div className="table-wrap user-history-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Task</th>
                            <th>Type</th>
                            <th>Fasting status</th>
                            <th>Amount</th>
                            <th>Details</th>
                            <th>Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.items.map((item) => (
                            <tr key={item.id}>
                              <td>{getCairoTimeLabel(new Date(item.occurredAt))}</td>
                              <td>{getActivityTitle(item)}</td>
                              <td>{getTaskTypeLabel(item)}</td>
                              <td>
                                {item.type === "TASK_COMPLETION"
                                  ? item.isDuringFasting
                                    ? "During fasting"
                                    : "Outside fasting"
                                  : "-"}
                              </td>
                              <td>
                                {formatAmountCell(item)}
                              </td>
                              <td>{getDetailsCell(item)}</td>
                              <td>{formatSignedPoints(item.effectivePoints)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </PanelCard>
            );
          })}
        </>
      )}
    </div>
  );
}
