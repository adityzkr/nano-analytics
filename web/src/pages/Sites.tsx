import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Site } from "../api";

export default function Sites() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    const d = await api<{ sites: Site[] }>("/sites");
    setSites(d.sites);
  }
  useEffect(() => {
    load();
  }, []);

  async function addSite(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/sites", { method: "POST", body: JSON.stringify({ name, domain }) });
      setName("");
      setDomain("");
      setAdding(false);
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (!sites) return <div className="page-center muted">Loading…</div>;

  return (
    <main className="container">
      <div className="row-between">
        <h2>Your sites</h2>
        <button className="btn primary" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "+ Add site"}
        </button>
      </div>

      {adding && (
        <form className="card add-site" onSubmit={addSite}>
          <input placeholder="Site name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} required />
          <button className="btn primary">Create</button>
          {error && <div className="error">{error}</div>}
        </form>
      )}

      {sites.length === 0 && !adding && (
        <div className="card empty">
          <p>No sites yet. Add your first site to get a tracking snippet.</p>
        </div>
      )}

      <div className="site-grid">
        {sites.map((s) => (
          <Link key={s.id} to={`/sites/${s.id}`} className="card site-card">
            <h3>{s.name}</h3>
            <span className="muted">{s.domain}</span>
            <div className="site-stat">
              <strong>{s.visitors_24h ?? 0}</strong> visitors in last 24h
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
