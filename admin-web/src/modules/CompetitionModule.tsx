import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { AdminUser, CompetitionState, CompetitionWinner } from "../types";

interface Props {
  users: AdminUser[];
}

const emptyState: CompetitionState = {
  isOpen: true,
  closedAt: null,
  winners: [],
  allowedUserIds: [],
  showWinnersPopup: false,
};

export function CompetitionModule({ users }: Props) {
  const [state, setState] = useState<CompetitionState>(emptyState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [allowedUserIds, setAllowedUserIds] = useState<number[]>([]);
  const [showWinnersPopup, setShowWinnersPopup] = useState(false);
  const [winnerIds, setWinnerIds] = useState<number[]>([0, 0, 0]);

  const userOptions = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    const base = trimmed
      ? users.filter((user) =>
          String(user.displayName || user.email || "")
            .toLowerCase()
            .includes(trimmed)
        )
      : users;
    return base.slice(0, 200);
  }, [search, users]);

  const loadState = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getCompetitionState();
      setState(data);
      setAllowedUserIds(data.allowedUserIds || []);
      setShowWinnersPopup(Boolean(data.showWinnersPopup));
      setWinnerIds([
        data.winners[0]?.userId || 0,
        data.winners[1]?.userId || 0,
        data.winners[2]?.userId || 0,
      ]);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not load competition state"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadState();
  }, []);

  const toggleAllowedUser = (id: number) => {
    setAllowedUserIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const buildWinnerPayload = (): CompetitionWinner[] => {
    return winnerIds
      .map((id, index) => {
        const user = users.find((row) => row.id === id);
        if (!id || !user) {
          return null;
        }
        return {
          userId: id,
          rank: index + 1,
          displayName: user.displayName || user.email || `User ${id}`,
          avatarUrl: user.avatarUrl || null,
          totalPoints: 0,
        };
      })
      .filter(Boolean) as CompetitionWinner[];
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await adminApi.updateCompetitionState({
        allowedUserIds,
        showWinnersPopup,
        winners: buildWinnerPayload(),
      });
      setState(data);
      setSuccess("Competition settings updated.");
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not update competition settings"));
    } finally {
      setSaving(false);
    }
  };

  const openCompetition = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await adminApi.openCompetition();
      setState(data);
      setSuccess("Competition opened.");
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not open competition"));
    } finally {
      setSaving(false);
    }
  };

  const closeCompetition = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        winners: buildWinnerPayload(),
        showWinnersPopup: true,
      };
      const data = await adminApi.closeCompetition(payload);
      setState(data);
      setSuccess("Competition closed. Winners are now published.");
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not close competition"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stack">
      <div className="card">
        <div className="card-header">
          <h2>Competition Status</h2>
          <p className="muted-text">
            Current state: {state.isOpen ? "Open" : "Closed"}
          </p>
        </div>
        <div className="card-actions">
          <button onClick={() => void openCompetition()} disabled={saving || state.isOpen}>
            Open Competition
          </button>
          <button onClick={() => void closeCompetition()} disabled={saving || !state.isOpen}>
            Close Competition
          </button>
          <button onClick={() => void loadState()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {state.closedAt ? (
          <p className="muted-text">Closed at: {new Date(state.closedAt).toLocaleString()}</p>
        ) : null}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Winners</h2>
          <p className="muted-text">Manage the top 3 winners shown to users.</p>
        </div>
        <div className="grid-3">
          {[0, 1, 2].map((index) => (
            <label key={index} className="field">
              <span>Rank {index + 1}</span>
              <select
                value={winnerIds[index] || 0}
                onChange={(event) => {
                  const next = [...winnerIds];
                  next[index] = Number(event.target.value);
                  setWinnerIds(next);
                }}
              >
                <option value={0}>Select user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName || user.email || `User ${user.id}`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {state.winners.length > 0 ? (
          <div className="list">
            {state.winners.map((winner) => (
              <div key={winner.userId} className="list-item">
                <strong>#{winner.rank}</strong> {winner.displayName} — {winner.totalPoints} pts
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-text">No winners saved yet.</p>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Allowed Users</h2>
          <p className="muted-text">
            Users in this list can still perform actions while competition is closed.
          </p>
        </div>
        <label className="field">
          <span>Search</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className="checkbox-grid">
          {userOptions.map((user) => {
            const checked = allowedUserIds.includes(user.id);
            return (
              <label key={user.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAllowedUser(user.id)}
                />
                <span>{user.displayName || user.email || `User ${user.id}`}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Popup</h2>
          <p className="muted-text">Control the winners popup on user devices.</p>
        </div>
        <label className="checkbox-item">
          <input
            type="checkbox"
            checked={showWinnersPopup}
            onChange={() => setShowWinnersPopup((prev) => !prev)}
          />
          <span>Show winners popup to users</span>
        </label>
        <button onClick={() => void saveSettings()} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}
      {success ? <p className="success-text">{success}</p> : null}
    </section>
  );
}
