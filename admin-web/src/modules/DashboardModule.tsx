import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import { AdminCounter, AdminTask, AdminUser, LeaderboardRow, NotificationCampaignListItem } from "../types";

interface DashboardModuleProps {
  tasks: AdminTask[];
  counters: AdminCounter[];
  users: AdminUser[];
  onRefreshReferences: () => Promise<void>;
}

export function DashboardModule({
  tasks,
  counters,
  users,
  onRefreshReferences,
}: DashboardModuleProps) {
  const [campaigns, setCampaigns] = useState<NotificationCampaignListItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignRows, leaderboardRows] = await Promise.all([
        adminApi.listNotificationCampaigns(5),
        adminApi.getLeaderboard(10),
      ]);
      setCampaigns(campaignRows);
      setLeaderboard(leaderboardRows);
    } catch (err) {
      setError(toApiErrorMessage(err, "Failed to load dashboard"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingRecipients = campaigns.reduce((sum, item) => sum + item.stats.pending, 0);

  return (
    <div className="stack">
      <PanelCard
        title="Overview"
        actions={
          <button
            onClick={() => {
              void onRefreshReferences();
              void loadData();
            }}
          >
            Refresh
          </button>
        }
      >
        <div className="metrics-grid">
          <article>
            <h4>{tasks.length}</h4>
            <p>Tasks configured</p>
          </article>
          <article>
            <h4>{counters.length}</h4>
            <p>Counters configured</p>
          </article>
          <article>
            <h4>{users.length}</h4>
            <p>Active users (search set)</p>
          </article>
          <article>
            <h4>{pendingRecipients}</h4>
            <p>Pending campaign recipients</p>
          </article>
        </div>
      </PanelCard>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p className="muted-text">Loading dashboard...</p> : null}

      <PanelCard title="Recent Campaigns">
        {campaigns.length === 0 ? (
          <p className="muted-text">No campaigns yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Target</th>
                  <th>Pending</th>
                  <th>Sent</th>
                  <th>Failed</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((item) => (
                  <tr key={item.campaign.id}>
                    <td>{item.campaign.title}</td>
                    <td>{item.campaign.targetType}</td>
                    <td>{item.stats.pending}</td>
                    <td>{item.stats.sent}</td>
                    <td>{item.stats.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      <PanelCard title="Top Leaderboard">
        {leaderboard.length === 0 ? (
          <p className="muted-text">No leaderboard rows yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Total</th>
                  <th>Public</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr key={row.rank}>
                    <td>{row.rank}</td>
                    <td>{row.user?.displayName || row.user?.email || "Unknown"}</td>
                    <td>{row.totalPoints}</td>
                    <td>{row.publicPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

