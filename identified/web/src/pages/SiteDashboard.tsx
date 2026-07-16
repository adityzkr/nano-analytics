import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api, type Site, type Stats, type Row, type Live, type Goal, type Person } from "../api";

const PERIOD_LABELS: Record<string, string> = {
  day: "Last 24 hours",
  week: "Last 7 days",
  month: "Last 30 days",
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn ghost"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SetupWizard({ site, waiting }: { site: Site; waiting: boolean }) {
  const [tab, setTab] = useState<"script" | "react" | "next">("script");
  const host = location.origin;
  const snippets: Record<string, { label: string; code: string; hint: string }> = {
    script: {
      label: "Script tag",
      code: `<script defer src="${host}/tracker.js" data-site-id="${site.id}"></script>`,
      hint: "Add to the <head> of every page (or your shared layout/template).",
    },
    react: {
      label: "React",
      code: `// main.tsx / index.tsx
import { init } from "nano-analytics";

init({ siteId: "${site.id}", host: "${host}" });`,
      hint: "npm install nano-analytics, then call init() once at startup. All routes are tracked automatically.",
    },
    next: {
      label: "Next.js",
      code: `// app/analytics.tsx
"use client";
import { useEffect } from "react";
import { init } from "nano-analytics";

export function Analytics() {
  useEffect(() => {
    init({ siteId: "${site.id}", host: "${host}" });
  }, []);
  return null;
}
// then render <Analytics /> in app/layout.tsx`,
      hint: "init() is SSR-safe; route changes via the App Router are tracked automatically.",
    },
  };
  const s = snippets[tab];

  return (
    <div className="card wizard">
      <h3>Install Nano Analytics on {site.domain}</h3>
      <div className="tabs">
        {Object.entries(snippets).map(([k, v]) => (
          <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k as any)}>
            {v.label}
          </button>
        ))}
      </div>
      <pre className="code-block">{s.code}</pre>
      <div className="row-between">
        <span className="muted hint">{s.hint}</span>
        <CopyButton text={s.code} />
      </div>
      {waiting && (
        <div className="waiting">
          <span className="live-dot" /> Waiting for the first event from your site…
        </div>
      )}
    </div>
  );
}

function RealtimePanel({ live }: { live: Live }) {
  const series = live.series.map((p) => ({
    ...p,
    label: new Date(p.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));
  return (
    <div className="card realtime">
      <div className="row-between">
        <h3>
          Realtime <span className="muted">last 30 min</span>
        </h3>
        <span className="live-badge">
          <span className="live-dot" /> {live.live} online
        </span>
      </div>
      <div className="realtime-body">
        <div className="realtime-chart">
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={series} margin={{ top: 4, right: 4, left: -30, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="pageviews" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="realtime-pages">
          <span className="muted">Pages being viewed now</span>
          {live.pages.length === 0 && <p className="muted">No one right now</p>}
          {live.pages.map((p) => (
            <div className="bar-row" key={p.label}>
              <span className="bar-label">{p.label}</span>
              <span className="bar-count">{p.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoalsCard({ siteId, period, visitors }: { siteId: string; period: string; visitors: number }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [name, setName] = useState("");
  const [eventName, setEventName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    () => api<{ goals: Goal[] }>(`/sites/${siteId}/goals?period=${period}`).then((d) => setGoals(d.goals)),
    [siteId, period]
  );
  useEffect(() => {
    load();
  }, [load]);

  async function addGoal(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(`/sites/${siteId}/goals`, {
        method: "POST",
        body: JSON.stringify({ name, eventName }),
      });
      setName("");
      setEventName("");
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove(id: number) {
    await api(`/sites/${siteId}/goals/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="card goals">
      <h3>Goals &amp; conversions</h3>
      {goals.length === 0 && (
        <p className="muted">
          Define a custom event as a conversion goal — e.g. event <code>signup</code> → goal “Signed up”.
        </p>
      )}
      {goals.length > 0 && (
        <table className="goals-table">
          <thead>
            <tr>
              <th>Goal</th>
              <th>Event</th>
              <th>Conversions</th>
              <th>Converters</th>
              <th>Rate</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {goals.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>
                  <code>{g.event_name}</code>
                </td>
                <td>{g.conversions}</td>
                <td>
                  {g.converters} / {visitors}
                </td>
                <td>{g.conversion_rate}%</td>
                <td>
                  <button className="btn link" onClick={() => remove(g.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form className="goal-form" onSubmit={addGoal}>
        <input placeholder="Goal name (e.g. Signed up)" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Event name (e.g. signup)" value={eventName} onChange={(e) => setEventName(e.target.value)} required />
        <button className="btn primary">Add goal</button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (24 * 60))}d ago`;
}

function PeopleCard({ siteId }: { siteId: string }) {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    const load = () => api<{ people: Person[] }>(`/sites/${siteId}/people`).then((d) => setPeople(d.people));
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [siteId]);

  return (
    <div className="card goals">
      <h3>People</h3>
      {people.length === 0 && <p className="muted">No visitors yet.</p>}
      {people.length > 0 && (
        <table className="goals-table">
          <thead>
            <tr>
              <th>Who</th>
              <th>Last seen</th>
              <th>First seen</th>
              <th>Page views</th>
              <th>Events</th>
              <th>Where</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.visitor}>
                <td>
                  {p.email || p.name ? (
                    <>
                      <strong>{p.name ?? p.email}</strong>
                      {p.name && p.email && <span className="muted"> · {p.email}</span>}
                    </>
                  ) : (
                    <span className="muted">Anonymous · {p.visitor.slice(0, 8)}</span>
                  )}
                </td>
                <td>{timeAgo(p.last_seen)}</td>
                <td>{new Date(p.first_seen).toLocaleDateString()}</td>
                <td>{p.pageviews}</td>
                <td>{p.events}</td>
                <td className="muted">
                  {[p.country, p.device].filter(Boolean).join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BreakdownCard({ title, rows, unit = "views" }: { title: string; rows: Row[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="card breakdown">
      <h3>{title}</h3>
      {rows.length === 0 && <p className="muted">No data yet</p>}
      {rows.map((r) => (
        <div className="bar-row" key={r.label} title={`${r.count} ${unit}`}>
          <div className="bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
          <span className="bar-label">{r.label}</span>
          <span className="bar-count">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

export default function SiteDashboard() {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [live, setLive] = useState<Live>({ live: 0, pages: [], series: [] });
  const [period, setPeriod] = useState("week");
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    api<{ sites: Site[] }>("/sites").then((d) => setSite(d.sites.find((s) => s.id === id) ?? null));
  }, [id]);

  const loadStats = useCallback(
    () => api<Stats>(`/sites/${id}/stats?period=${period}`).then(setStats),
    [id, period]
  );
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const hasData =
    !!stats && (stats.totals.pageviews > 0 || stats.totals.custom_events > 0);

  // While the site has no data, poll so the wizard flips to the dashboard
  // as soon as the first event arrives.
  useEffect(() => {
    if (!stats || hasData) return;
    const t = setInterval(loadStats, 5000);
    return () => clearInterval(t);
  }, [stats, hasData, loadStats]);

  useEffect(() => {
    const poll = () => api<Live>(`/sites/${id}/stats/live`).then(setLive);
    poll();
    const t = setInterval(poll, 10_000);
    return () => clearInterval(t);
  }, [id]);

  if (!site || !stats) return <div className="page-center muted">Loading…</div>;

  const series = stats.series.map((p) => ({
    ...p,
    label:
      stats.bucket === "hour"
        ? new Date(p.bucket).toLocaleTimeString([], { hour: "numeric" })
        : new Date(p.bucket).toLocaleDateString([], { month: "short", day: "numeric" }),
  }));

  const totals = [
    { label: "Unique visitors", value: String(stats.totals.visitors) },
    { label: "Page views", value: String(stats.totals.pageviews) },
    { label: "Sessions", value: String(stats.totals.sessions) },
    { label: "Bounce rate", value: `${stats.totals.bounce_rate}%` },
    { label: "Avg session", value: formatDuration(stats.totals.avg_duration) },
    { label: "Custom events", value: String(stats.totals.custom_events) },
  ];

  return (
    <main className="container">
      <div className="row-between">
        <div>
          <Link to="/" className="muted back-link">
            ← All sites
          </Link>
          <h2>
            {site.name} <span className="muted domain">{site.domain}</span>
          </h2>
        </div>
        <div className="row-gap">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {Object.entries(PERIOD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="btn ghost" onClick={() => setShowWizard(!showWizard)}>
            Install snippet
          </button>
        </div>
      </div>

      {(!hasData || showWizard) && <SetupWizard site={site} waiting={!hasData} />}

      {hasData && (
        <>
          <RealtimePanel live={live} />

          <div className="totals">
            {totals.map((t) => (
              <div className="card total" key={t.label}>
                <span className="muted">{t.label}</span>
                <strong>{t.value}</strong>
              </div>
            ))}
          </div>

          <div className="card chart-card">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="pageviews" stroke="#6366f1" fill="url(#pv)" strokeWidth={2} />
                <Area type="monotone" dataKey="visitors" stroke="#22c55e" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <PeopleCard siteId={site.id} />

          <GoalsCard siteId={site.id} period={period} visitors={stats.totals.visitors} />

          <div className="breakdown-grid">
            <BreakdownCard title="Top pages" rows={stats.pages} />
            <BreakdownCard title="Referrers" rows={stats.referrers} />
            <BreakdownCard title="UTM sources" rows={stats.utmSources} />
            <BreakdownCard title="Custom events" rows={stats.events} unit="events" />
            <BreakdownCard title="Browsers" rows={stats.browsers} />
            <BreakdownCard title="Operating systems" rows={stats.oses} />
            <BreakdownCard title="Devices" rows={stats.devices} />
            <BreakdownCard title="Countries" rows={stats.countries} />
          </div>
        </>
      )}
    </main>
  );
}
