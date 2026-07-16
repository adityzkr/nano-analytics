import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { api } from "./api";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Sites from "./pages/Sites";
import SiteDashboard from "./pages/SiteDashboard";

export interface User {
  id: number;
  email: string;
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) return <div className="page-center muted">Loading…</div>;

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    navigate("/login");
  }

  return (
    <>
      {user && (
        <header className="topbar">
          <a href="/" className="brand">
            ▲ Nano Analytics <span className="id-badge">ID</span>
          </a>
          <div className="topbar-right">
            <span className="muted">{user.email}</span>
            <button className="btn ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
      )}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
        <Route path="/" element={user ? <Sites /> : <Landing />} />
        <Route path="/sites/:id" element={user ? <SiteDashboard /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}
