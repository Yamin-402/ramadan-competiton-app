import { FormEvent, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import { AdminUser } from "../types";

interface AdjustmentsModuleProps {
  users: AdminUser[];
}

export function AdjustmentsModule({ users }: AdjustmentsModuleProps) {
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const parsedUserId = Number(userId);
      const parsedPoints = Number(points);
      if (!parsedUserId || Number.isNaN(parsedUserId)) {
        throw new Error("User is required.");
      }
      if (Number.isNaN(parsedPoints)) {
        throw new Error("Points value is invalid.");
      }

      await adminApi.createManualAdjustment({
        userId: parsedUserId,
        points: parsedPoints,
        note: note.trim() || undefined,
      });

      setUserId("");
      setPoints("");
      setNote("");
      setSuccess("Manual adjustment created.");
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not create adjustment"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PanelCard title="Manual Point Adjustment">
      <form className="form-grid" onSubmit={submit}>
        <label>
          User
          <select value={userId} onChange={(event) => setUserId(event.target.value)} required>
            <option value="">Select user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName || user.email} ({user.id})
              </option>
            ))}
          </select>
        </label>
        <label>
          Points (+/-)
          <input
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            placeholder="-5 or 20"
            type="number"
            step="0.01"
            required
          />
        </label>
        <label className="form-grid__full">
          Note
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional admin note"
          />
        </label>
        {error ? <p className="error-text form-grid__full">{error}</p> : null}
        {success ? <p className="success-text form-grid__full">{success}</p> : null}
        <div className="form-grid__full">
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Create adjustment"}
          </button>
        </div>
      </form>
    </PanelCard>
  );
}

