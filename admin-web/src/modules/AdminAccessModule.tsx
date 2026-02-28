import { FormEvent, useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/admin-api";
import { toApiErrorMessage } from "../api/http";
import { PanelCard } from "../components/PanelCard";
import { AdminUser } from "../types";

interface AdminAccessModuleProps {
  users: AdminUser[];
  onRefreshReferences: () => Promise<void>;
}

type AdminRole = "ADMIN" | "SUPER_ADMIN";

const roleOptions: Array<{ value: AdminRole; label: string }> = [
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

function normalizePermissionList(values: string[] | null | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(values.map((value) => String(value).trim().toUpperCase()).filter(Boolean))
  ).sort();
}

function togglePermission(current: string[], key: string): string[] {
  const nextSet = new Set(current);
  if (nextSet.has(key)) {
    nextSet.delete(key);
  } else {
    nextSet.add(key);
  }
  return Array.from(nextSet).sort();
}

export function AdminAccessModule({ users, onRefreshReferences }: AdminAccessModuleProps) {
  const [permissionKeys, setPermissionKeys] = useState<string[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);

  const [targetUserId, setTargetUserId] = useState("");
  const [targetRole, setTargetRole] = useState<AdminRole>("ADMIN");
  const [targetPermissions, setTargetPermissions] = useState<string[]>([]);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email)),
    [users]
  );

  const adminUsers = useMemo(
    () => sortedUsers.filter((user) => user.role === "ADMIN" || user.role === "SUPER_ADMIN"),
    [sortedUsers]
  );

  const selectedTargetUser = useMemo(
    () => (targetUserId ? sortedUsers.find((user) => user.id === Number(targetUserId)) || null : null),
    [sortedUsers, targetUserId]
  );

  useEffect(() => {
    const loadPermissions = async () => {
      setLoadingPermissions(true);
      setError(null);
      try {
        const data = await adminApi.listAdminPermissions();
        setPermissionKeys(normalizePermissionList(data));
      } catch (err) {
        setError(toApiErrorMessage(err, "Could not load permission keys"));
      } finally {
        setLoadingPermissions(false);
      }
    };

    void loadPermissions();
  }, []);

  useEffect(() => {
    if (!selectedTargetUser) {
      return;
    }
    setTargetRole(selectedTargetUser.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN");
    setTargetPermissions(normalizePermissionList(selectedTargetUser.adminPermissions));
  }, [selectedTargetUser]);

  const createAdminAccount = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);

    try {
      await adminApi.createAdminAccount({
        email: newEmail.trim(),
        password: newPassword,
        displayName: newDisplayName.trim() || undefined,
        role: newRole,
        adminPermissions: newRole === "ADMIN" ? newPermissions : undefined,
      });
      await onRefreshReferences();
      setSuccess("Admin account created.");
      setNewEmail("");
      setNewPassword("");
      setNewDisplayName("");
      setNewRole("ADMIN");
      setNewPermissions([]);
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not create admin account"));
    } finally {
      setBusy(false);
    }
  };

  const updateAdminAccess = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedTargetUser) {
      setError("Select a user first.");
      return;
    }

    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await adminApi.updateAdminAccess(selectedTargetUser.id, {
        role: targetRole,
        adminPermissions: targetRole === "ADMIN" ? targetPermissions : undefined,
      });
      await onRefreshReferences();
      setSuccess("Admin access updated.");
    } catch (err) {
      setError(toApiErrorMessage(err, "Could not update admin access"));
    } finally {
      setBusy(false);
    }
  };

  const renderPermissionChecklist = (
    selected: string[],
    onChange: (next: string[]) => void,
    disabled: boolean
  ) => (
    <div className="chip-row tasks-chip-row">
      {permissionKeys.map((key) => {
        const checked = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            className={`chip ${checked ? "chip--active" : ""}`}
            onClick={() => onChange(togglePermission(selected, key))}
            disabled={disabled}
          >
            {key}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="stack">
      <PanelCard title="Admin Accounts">
        <p className="muted-text">
          Super admin can create admin accounts, promote existing users, and set page permissions.
        </p>

        {error ? <p className="error-text">{error}</p> : null}
        {success ? <p className="success-text">{success}</p> : null}
        {loadingPermissions ? <p className="muted-text">Loading permission keys...</p> : null}
      </PanelCard>

      <PanelCard title="Create Admin Account">
        <form className="form-grid" onSubmit={createAdminAccount}>
          <label>
            Email
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          <label>
            Display name (optional)
            <input
              value={newDisplayName}
              onChange={(event) => setNewDisplayName(event.target.value)}
            />
          </label>

          <label>
            Role
            <select
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as "ADMIN" | "SUPER_ADMIN")}
            >
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </label>

          {newRole === "ADMIN" ? (
            <label className="form-grid__full">
              Admin permissions
              {renderPermissionChecklist(newPermissions, setNewPermissions, busy || loadingPermissions)}
            </label>
          ) : null}

          <div className="form-grid__full inline-form">
            <button type="submit" disabled={busy || loadingPermissions}>
              {busy ? "Saving..." : "Create account"}
            </button>
          </div>
        </form>
      </PanelCard>

      <PanelCard title="Promote / Restrict Existing User">
        <form className="form-grid" onSubmit={updateAdminAccess}>
          <label className="form-grid__full">
            User
            <select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)}>
              <option value="">Select user</option>
              {sortedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName || user.email} ({user.role})
                </option>
              ))}
            </select>
          </label>

          <label>
            Role
            <select
              value={targetRole}
              onChange={(event) => setTargetRole(event.target.value as AdminRole)}
              disabled={!selectedTargetUser}
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-grid__full">
            Admin permissions
            {targetRole === "ADMIN" ? (
              renderPermissionChecklist(
                targetPermissions,
                setTargetPermissions,
                busy || loadingPermissions || !selectedTargetUser
              )
            ) : (
              <p className="muted-text">Permissions apply only for role ADMIN.</p>
            )}
          </label>

          <div className="form-grid__full inline-form">
            <button type="submit" disabled={busy || !selectedTargetUser || loadingPermissions}>
              {busy ? "Saving..." : "Save access"}
            </button>
          </div>
        </form>
      </PanelCard>

      <PanelCard title="Current Admins">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Role</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.displayName || user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    {user.role === "SUPER_ADMIN"
                      ? "Full access"
                      : normalizePermissionList(user.adminPermissions).join(", ") || "No explicit permissions"}
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
