import { FormEvent, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import { AdminCounter } from "../types";

interface CountersModuleProps {
  counters: AdminCounter[];
  onRefreshReferences: () => Promise<void>;
}

export function CountersModule({ counters, onRefreshReferences }: CountersModuleProps) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await adminApi.createCounter({
        key: key.trim(),
        name: name.trim(),
        unit: unit.trim() || undefined,
        description: description.trim() || undefined,
        isActive,
      });

      await onRefreshReferences();
      setKey("");
      setName("");
      setUnit("");
      setDescription("");
      setIsActive(true);
      setSuccess("Counter created.");
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not create counter"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="stack">
      <PanelCard title="Create Counter">
        <form className="form-grid" onSubmit={submit}>
          <label>
            Key
            <input value={key} onChange={(event) => setKey(event.target.value)} placeholder="quran_pages" required />
          </label>
          <label>
            Name
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Quran Pages" required />
          </label>
          <label>
            Unit
            <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="pages" />
          </label>
          <label className="form-grid__full">
            Description
            <textarea
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional description"
            />
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Active
          </label>
          {error ? <p className="error-text form-grid__full">{error}</p> : null}
          {success ? <p className="success-text form-grid__full">{success}</p> : null}
          <div className="form-grid__full">
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create counter"}
            </button>
          </div>
        </form>
      </PanelCard>

      <PanelCard title="Counters">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Key</th>
                <th>Name</th>
                <th>Unit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {counters.map((counter) => (
                <tr key={counter.id}>
                  <td>{counter.id}</td>
                  <td>{counter.key}</td>
                  <td>{counter.name}</td>
                  <td>{counter.unit || "-"}</td>
                  <td>{counter.isActive ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}

