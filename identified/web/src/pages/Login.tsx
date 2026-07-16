import { useState, type FormEvent } from "react";
import { api } from "../api";
import type { User } from "../App";

export default function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const d = await api<{ user: User }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(d.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-center">
      <form className="card auth-card" onSubmit={submit}>
        <h1>▲ Nano Analytics</h1>
        <p className="muted">{mode === "login" ? "Welcome back" : "Create your account"}</p>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={busy}>
          {mode === "login" ? "Log in" : "Sign up"}
        </button>
        <button
          type="button"
          className="btn link"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "No account? Sign up" : "Have an account? Log in"}
        </button>
      </form>
    </div>
  );
}
