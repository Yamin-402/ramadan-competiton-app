import { AdminSession } from "../types";

const STORAGE_KEY = "ramadan_admin_session";

export function loadSession(): AdminSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed?.user?.id || !parsed?.user?.role || !parsed?.token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession | null) {
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

