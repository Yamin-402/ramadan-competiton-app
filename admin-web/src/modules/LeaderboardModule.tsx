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
  const [togglingVisibilityUserId, setTogglingVisibilityUserId] = useState<number | null>(null);
  const [removingAvatarUserId, setRemovingAvatarUserId] = useState<number | null>(null);

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

  const toggleVisibility = async (userId: number, isVisible: boolean) => {
    setError(null);
    setTogglingVisibilityUserId(userId);
    try {
      await adminApi.setUserLeaderboardVisibility(userId, !isVisible);
      await loadRows(Number(limit) || 200);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not update leaderboard visibility"));
    } finally {
      setTogglingVisibilityUserId(null);
    }
  };

  const removeAvatar = async (userId: number) => {
    const confirmed = window.confirm("Remove this profile photo?");
    if (!confirmed) {
      return;
    }

    setError(null);
    setRemovingAvatarUserId(userId);
    try {
      await adminApi.deleteUserAvatar(userId);
      await loadRows(Number(limit) || 200);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not remove profile photo"));
    } finally {
      setRemovingAvatarUserId(null);
    }
  };

  return (
    <PanelCard title="Admin Leaderboard">
      <form className="inline-form" onSubmit={submit}>
        <label>
          Limit
          <input
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            type="number"
            min={1}
            max={5000}
          />
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
              <th>Visible</th>
              <th>Total points</th>
              <th>Public points</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user?.id || row.rank}>
                <td>{row.rank}</td>
                <td>
                  {row.user ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {row.user.avatarUrl ? (
                        <img
                          src={row.user.avatarUrl}
                          alt={row.user.displayName || row.user.email}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            objectFit: "cover",
                            border: "1px solid #d8dce8",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid #d8dce8",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {(row.user.displayName || row.user.email || "U").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span>{row.user.displayName || row.user.email || "Unknown"}</span>
                    </div>
                  ) : (
                    "Unknown"
                  )}
                </td>
                <td>
                  {row.user?.isLeaderboardVisible === false ? (
                    <span style={{ color: "#b42318", fontWeight: 700 }}>Hidden</span>
                  ) : (
                    <span style={{ color: "#067647", fontWeight: 700 }}>Visible</span>
                  )}
                </td>
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
                        onClick={() =>
                          void toggleVisibility(row.user!.id, row.user!.isLeaderboardVisible !== false)
                        }
                        disabled={togglingVisibilityUserId === row.user!.id}
                      >
                        {togglingVisibilityUserId === row.user!.id
                          ? "Saving..."
                          : row.user.isLeaderboardVisible === false
                            ? "Reveal on users leaderboard"
                            : "Hide from users leaderboard"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeAvatar(row.user!.id)}
                        disabled={removingAvatarUserId === row.user!.id}
                      >
                        {removingAvatarUserId === row.user!.id ? "Removing photo..." : "Remove photo"}
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

