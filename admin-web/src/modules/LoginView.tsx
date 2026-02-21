import { FormEvent, useState } from "react";
import { authApi } from "../api/auth-api";
import { toApiErrorMessage } from "../api/http";
import { AdminSession } from "../types";

interface LoginViewProps {
  onLoggedIn: (session: AdminSession) => void;
}

export function LoginView({ onLoggedIn }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const session = await authApi.login({
        email: email.trim(),
        password,
      });

      if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
        setError("هذا الحساب ليس لديه صلاحية دخول لوحة المشرف.");
        return;
      }

      onLoggedIn(session);
    } catch (err) {
      setError(toApiErrorMessage(err, "تعذر تسجيل الدخول"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-layout">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>لوحة مشرف مسابقة رمضان</h1>
        <p>سجل الدخول بحساب ADMIN أو SUPER_ADMIN.</p>

        <label>
          البريد الإلكتروني
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
            type="email"
            required
            autoComplete="username"
          />
        </label>

        <label>
          كلمة المرور
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="اكتب كلمة المرور"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" disabled={submitting}>
          {submitting ? "جارٍ تسجيل الدخول..." : "دخول"}
        </button>
      </form>
    </main>
  );
}
