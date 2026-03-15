import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi } from "./api/admin-api";
import { setHttpSession, toApiErrorMessage } from "./api/http";
import { publicApi } from "./api/public-api";
import { LoginView } from "./modules/LoginView";
import { loadSession, saveSession } from "./session/session";
import { AdminCounter, AdminSession, AdminTask, AdminUser, Tag } from "./types";
import { DashboardModule } from "./modules/DashboardModule";
import { TasksModule } from "./modules/TasksModule";
import { CountersModule } from "./modules/CountersModule";
import { TaskCounterRulesModule } from "./modules/TaskCounterRulesModule";
import { AdjustmentsModule } from "./modules/AdjustmentsModule";
import { NotificationsModule } from "./modules/NotificationsModule";
import { DailyQuestionsModule } from "./modules/DailyQuestionsModule";
import { LeaderboardModule } from "./modules/LeaderboardModule";
import { CompetitionModule } from "./modules/CompetitionModule";
import { UserTaskHistoryModule } from "./modules/UserTaskHistoryModule";
import { AdminAccessModule } from "./modules/AdminAccessModule";

type ModuleKey =
  | "dashboard"
  | "tasks"
  | "counters"
  | "taskCounterRules"
  | "adjustments"
  | "notifications"
  | "dailyQuestions"
  | "leaderboard"
  | "competition"
  | "userTaskHistory"
  | "adminAccess";

const baseModuleItems: Array<{ key: ModuleKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "tasks", label: "Tasks" },
  { key: "counters", label: "Counters" },
  { key: "taskCounterRules", label: "Task-Counter Links" },
  { key: "adjustments", label: "Manual Points" },
  { key: "notifications", label: "Notifications" },
  { key: "dailyQuestions", label: "Daily Questions" },
  { key: "leaderboard", label: "Leaderboard" },
  { key: "competition", label: "Competition" },
  { key: "userTaskHistory", label: "User Task History" },
];

export default function App() {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession());
  const [activeModule, setActiveModule] = useState<ModuleKey>("dashboard");
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [counters, setCounters] = useState<AdminCounter[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [historyTargetUserId, setHistoryTargetUserId] = useState<number | null>(null);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [referenceError, setReferenceError] = useState<string | null>(null);

  const moduleItems = useMemo(() => {
    if (session?.user.role === "SUPER_ADMIN") {
      return [...baseModuleItems, { key: "adminAccess" as ModuleKey, label: "Admin Access" }];
    }

    return baseModuleItems;
  }, [session?.user.role]);

  const refreshReferences = useCallback(async () => {
    setLoadingReferences(true);
    setReferenceError(null);
    try {
      const [taskRows, counterRows, userRows, tagRows] = await Promise.all([
        adminApi.listTasks({ includePrivate: true, limit: 300 }),
        adminApi.listCounters({ includeInactive: true, limit: 300 }),
        adminApi.listUsers({ limit: 300 }),
        publicApi.listTags(true),
      ]);

      setTasks(taskRows);
      setCounters(counterRows);
      setUsers(userRows);
      setTags(tagRows);
    } catch (err) {
      setReferenceError(toApiErrorMessage(err, "Could not load admin reference data"));
    } finally {
      setLoadingReferences(false);
    }
  }, []);

  useEffect(() => {
    setHttpSession(session);
    saveSession(session);

    if (session) {
      void refreshReferences();
    } else {
      setTasks([]);
      setCounters([]);
      setUsers([]);
      setTags([]);
    }
  }, [refreshReferences, session]);

  const activeModuleLabel = useMemo(
    () => moduleItems.find((item) => item.key === activeModule)?.label || "Dashboard",
    [activeModule]
  );

  if (!session) {
    return <LoginView onLoggedIn={setSession} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Admin Panel</h2>
        <p className="muted-text">Ramadan Competition</p>
        <nav>
          {moduleItems.map((item) => (
            <button
              key={item.key}
              className={`sidebar-item ${item.key === activeModule ? "sidebar-item--active" : ""}`}
              onClick={() => setActiveModule(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="content-header">
          <div>
            <h1>{activeModuleLabel}</h1>
            <p className="muted-text">
              Logged in as: {session.user.displayName || session.user.email} ({session.user.role})
            </p>
          </div>
          <div className="header-actions">
            <button onClick={() => void refreshReferences()} disabled={loadingReferences}>
              {loadingReferences ? "Refreshing..." : "Refresh data"}
            </button>
            <button
              onClick={() => {
                setSession(null);
                setHttpSession(null);
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {referenceError ? <p className="error-text">{referenceError}</p> : null}

        {activeModule === "dashboard" ? (
          <DashboardModule
            tasks={tasks}
            counters={counters}
            users={users}
            onRefreshReferences={refreshReferences}
          />
        ) : null}

        {activeModule === "tasks" ? (
          <TasksModule
            tasks={tasks}
            counters={counters}
            tags={tags}
            onRefreshReferences={refreshReferences}
          />
        ) : null}

        {activeModule === "counters" ? (
          <CountersModule counters={counters} onRefreshReferences={refreshReferences} />
        ) : null}

        {activeModule === "taskCounterRules" ? (
          <TaskCounterRulesModule tasks={tasks} counters={counters} />
        ) : null}

        {activeModule === "adjustments" ? <AdjustmentsModule users={users} /> : null}

        {activeModule === "notifications" ? <NotificationsModule tags={tags} users={users} /> : null}

        {activeModule === "dailyQuestions" ? <DailyQuestionsModule /> : null}

        {activeModule === "leaderboard" ? (
          <LeaderboardModule
            onOpenUserHistory={(userId) => {
              setHistoryTargetUserId(userId);
              setActiveModule("userTaskHistory");
            }}
          />
        ) : null}

        {activeModule === "competition" ? (
          <CompetitionModule users={users} />
        ) : null}

        {activeModule === "userTaskHistory" ? (
          <UserTaskHistoryModule users={users} initialUserId={historyTargetUserId} />
        ) : null}

        {activeModule === "adminAccess" && session.user.role === "SUPER_ADMIN" ? (
          <AdminAccessModule users={users} onRefreshReferences={refreshReferences} />
        ) : null}
      </main>
    </div>
  );
}


