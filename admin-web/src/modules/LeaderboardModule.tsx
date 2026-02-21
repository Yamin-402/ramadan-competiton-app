import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import { LeaderboardRow } from "../types";

interface LeaderboardModuleProps {
  onOpenUserHistory: (userId: number) => void;
}

export function LeaderboardModule({ onOpenUserHistory }: LeaderboardModuleProps) {
  const [limit, setLimit] = useState("200");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

  const loadRows = async (value: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getLeaderboard(value);
      setRows(data);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not load leaderboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows(200);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsedLimit = Number(limit);
    if (!parsedLimit || Number.isNaN(parsedLimit)) {
      setError("Limit is invalid.");
      return;
    }

    await loadRows(parsedLimit);
  };

  const removeUser = async (userId: number) => {
    const confirmed = window.confirm(
      "Remove this user from the competition? This will deactivate their account."
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setRemovingUserId(userId);
    try {
      await adminApi.deleteUser(userId);
      await loadRows(Number(limit) || 200);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not remove user"));
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <PanelCard title="Admin Leaderboard">
      <form className="inline-form" onSubmit={submit}>
        <label>
          Limit
          <input value={limit} onChange={(event) => setLimit(event.target.value)} type="number" min={1} max={5000} />
        </label>
        <button type="submit">Load</button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}
      {loading ? <p className="muted-text">Loading leaderboard...</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Total points</th>
              <th>Public points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rank}>
                <td>{row.rank}</td>
                <td>{row.user?.displayName || row.user?.email || "Unknown"}</td>
                <td>{row.totalPoints}</td>
                <td>{row.publicPoints}</td>
                <td>
                  {row.user ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => onOpenUserHistory(row.user!.id)}>
                        User task history
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeUser(row.user!.id)}
                        disabled={removingUserId === row.user!.id}
                      >
                        {removingUserId === row.user!.id ? "Removing..." : "Remove user"}
                      </button>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelCard>
  );
}
