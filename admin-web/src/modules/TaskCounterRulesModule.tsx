import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import { AdminCounter, AdminTask, AdminTaskCounterRule, CounterValueSource } from "../types";

interface TaskCounterRulesModuleProps {
  tasks: AdminTask[];
  counters: AdminCounter[];
}

export function TaskCounterRulesModule({ tasks, counters }: TaskCounterRulesModuleProps) {
  const [rows, setRows] = useState<AdminTaskCounterRule[]>([]);
  const [taskId, setTaskId] = useState("");
  const [counterId, setCounterId] = useState("");
  const [valueSource, setValueSource] = useState<CounterValueSource>("FIXED");
  const [fixedDelta, setFixedDelta] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listTaskCounterRules();
      setRows(data);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not load task counter rules"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const parsedTaskId = Number(taskId);
      const parsedCounterId = Number(counterId);
      if (!parsedTaskId || !parsedCounterId) {
        throw new Error("Task and counter are required.");
      }

      const parsedFixedDelta = fixedDelta ? Number(fixedDelta) : undefined;
      if (valueSource === "FIXED" && (parsedFixedDelta === undefined || Number.isNaN(parsedFixedDelta))) {
        throw new Error("Fixed delta is required when value source is FIXED.");
      }

      await adminApi.createTaskCounterRule({
        taskId: parsedTaskId,
        counterId: parsedCounterId,
        valueSource,
        fixedDelta: valueSource === "FIXED" ? parsedFixedDelta : undefined,
      });

      setTaskId("");
      setCounterId("");
      setValueSource("FIXED");
      setFixedDelta("");
      setSuccess("Rule created.");
      await loadRows();
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not create rule"));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: number) => {
    setError(null);
    setSuccess(null);
    try {
      await adminApi.deleteTaskCounterRule(id);
      setSuccess("Rule deleted.");
      await loadRows();
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not delete rule"));
    }
  };

  return (
    <div className="stack">
      <PanelCard title="Create Task Counter Rule" actions={<button onClick={() => void loadRows()}>Refresh</button>}>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Task
            <select value={taskId} onChange={(event) => setTaskId(event.target.value)} required>
              <option value="">Select task</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title} ({task.id})
                </option>
              ))}
            </select>
          </label>
          <label>
            Counter
            <select value={counterId} onChange={(event) => setCounterId(event.target.value)} required>
              <option value="">Select counter</option>
              {counters.map((counter) => (
                <option key={counter.id} value={counter.id}>
                  {counter.name} ({counter.id})
                </option>
              ))}
            </select>
          </label>
          <label>
            Value source
            <select
              value={valueSource}
              onChange={(event) => setValueSource(event.target.value as CounterValueSource)}
            >
              <option value="FIXED">FIXED</option>
              <option value="ACTIVITY_INPUT">ACTIVITY_INPUT</option>
            </select>
          </label>
          <label>
            Fixed delta
            <input
              value={fixedDelta}
              onChange={(event) => setFixedDelta(event.target.value)}
              placeholder="10"
              type="number"
              step="0.01"
              disabled={valueSource !== "FIXED"}
            />
          </label>
          {error ? <p className="error-text form-grid__full">{error}</p> : null}
          {success ? <p className="success-text form-grid__full">{success}</p> : null}
          <div className="form-grid__full">
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Create rule"}
            </button>
          </div>
        </form>
      </PanelCard>

      <PanelCard title="Task Counter Rules">
        {loading ? <p className="muted-text">Loading rules...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Task</th>
                <th>Counter</th>
                <th>Source</th>
                <th>Fixed delta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.id}</td>
                  <td>{rule.task.title}</td>
                  <td>{rule.counter.name}</td>
                  <td>{rule.valueSource}</td>
                  <td>{rule.fixedDelta === null ? "-" : String(rule.fixedDelta)}</td>
                  <td>
                    <button onClick={() => void onDelete(rule.id)} type="button">
                      Delete
                    </button>
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

