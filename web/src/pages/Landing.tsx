import { Link } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

const demoSeries = [
  { label: "Mon", pageviews: 320, visitors: 210 },
  { label: "Tue", pageviews: 410, visitors: 260 },
  { label: "Wed", pageviews: 380, visitors: 245 },
  { label: "Thu", pageviews: 520, visitors: 330 },
  { label: "Fri", pageviews: 610, visitors: 390 },
  { label: "Sat", pageviews: 480, visitors: 305 },
  { label: "Sun", pageviews: 700, visitors: 452 },
];

const features = [
  {
    icon: "⚡",
    title: "Realtime, minute by minute",
    text: "See who's on your site right now and which pages they're reading. Watch a launch or newsletter land as it happens.",
  },
  {
    icon: "🍪",
    title: "No cookies. No banner.",
    text: "Nothing is stored on your visitors' devices, so there's nothing to ask consent for. Your site stays clean and compliant.",
  },
  {
    icon: "📦",
    title: "One line to install",
    text: "A 1 KB script tag or npm package. Every page and every route — including single-page apps — is tracked automatically.",
  },
  {
    icon: "🎯",
    title: "Goals & conversions",
    text: "Mark any action — a signup, a purchase — as a goal and see what percentage of visitors actually do it.",
  },
  {
    icon: "📈",
    title: "The metrics that matter",
    text: "Visitors, sessions, bounce rate, session duration, top pages, referrers, UTM campaigns, devices, and countries.",
  },
  {
    icon: "🔑",
    title: "Your data, your server",
    text: "Self-hosted on your own infrastructure. No third party sees your traffic. Ever.",
  },
];

const tiers = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    highlight: false,
    features: ["1 site", "10k events / month", "Realtime dashboard", "All core metrics"],
    cta: "Start free",
  },
  {
    name: "Growth",
    price: "$9",
    period: "/ month",
    highlight: true,
    features: ["10 sites", "1M events / month", "Goals & conversions", "Priority support"],
    cta: "Start 14-day trial",
  },
  {
    name: "Scale",
    price: "$29",
    period: "/ month",
    highlight: false,
    features: ["Unlimited sites", "10M events / month", "Everything in Growth", "Onboarding help"],
    cta: "Start 14-day trial",
  },
];

const faqs = [
  {
    q: "How is this different from Google Analytics?",
    a: "Google Analytics is free because your visitors' data feeds Google's ad business. Nano Analytics runs on your own server, collects no personal data, and shows you everything on one screen you can read in ten seconds — no 200-page interface.",
  },
  {
    q: "Is it GDPR-friendly?",
    a: "No cookies, no persistent identifiers, no IP addresses stored — visitors can't be identified or followed across days. That's why no consent banner is needed for analytics.",
  },
  {
    q: "Will ad blockers affect it?",
    a: "Some do block analytics scripts. Because you self-host on your own domain, far fewer block it than block Google Analytics.",
  },
  {
    q: "Does it work with React / Next.js / Vue?",
    a: "Yes — install the npm package, call init() once, and every route change is tracked automatically. Or just use the script tag.",
  },
  {
    q: "What does 'events per month' mean?",
    a: "One event = one page view or one custom event. A visitor reading 5 pages = 5 events. Most small sites use well under 10k a month.",
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="brand">▲ Nano Analytics</span>
        <nav className="landing-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <Link to="/login" className="btn ghost">
            Log in
          </Link>
          <Link to="/login" className="btn primary">
            Start free
          </Link>
        </nav>
      </header>

      <section className="hero">
        <h1>
          Know your visitors.
          <br />
          <span className="accent">Without tracking them.</span>
        </h1>
        <p className="hero-sub">
          Simple, realtime web analytics you host yourself. Every number that matters on one
          screen — and no cookie banner, because there are no cookies.
        </p>
        <div className="hero-ctas">
          <Link to="/login" className="btn primary big">
            Start free — no card needed
          </Link>
          <a href="#features" className="btn ghost big">
            See what you get
          </a>
        </div>

        <div className="hero-preview card">
          <div className="preview-head">
            <span className="live-badge">
              <span className="live-dot" /> 47 online
            </span>
            <div className="preview-stats">
              <div>
                <span className="muted">Visitors</span>
                <strong>2,192</strong>
              </div>
              <div>
                <span className="muted">Page views</span>
                <strong>3,420</strong>
              </div>
              <div>
                <span className="muted">Bounce</span>
                <strong>42%</strong>
              </div>
              <div>
                <span className="muted">Conversion</span>
                <strong>3.1%</strong>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={demoSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="lpv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="pageviews" stroke="#6366f1" fill="url(#lpv)" strokeWidth={2} />
              <Area type="monotone" dataKey="visitors" stroke="#22c55e" fill="none" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="section" id="features">
        <h2 className="section-title">Everything you need. Nothing you have to Google.</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div className="card feature" key={f.title}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p className="muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section steps-section">
        <h2 className="section-title">Live in three minutes</h2>
        <div className="steps">
          <div className="step">
            <span className="step-num">1</span>
            <h3>Add your site</h3>
            <p className="muted">Sign up, type your site's name and address. That's the whole form.</p>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <h3>Paste one line</h3>
            <p className="muted">
              Copy the snippet from the setup wizard into your site — or npm install the SDK.
            </p>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <h3>Watch it flow</h3>
            <p className="muted">
              The dashboard flips on with your first visitor. Realtime from second one.
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <h2 className="section-title">Honest pricing</h2>
        <p className="section-sub muted">
          You're the customer — not the product. That's the whole business model.
        </p>
        <div className="pricing-grid">
          {tiers.map((t) => (
            <div className={`card tier ${t.highlight ? "highlight" : ""}`} key={t.name}>
              {t.highlight && <span className="tier-badge">Most popular</span>}
              <h3>{t.name}</h3>
              <div className="tier-price">
                <strong>{t.price}</strong>
                <span className="muted"> {t.period}</span>
              </div>
              <ul>
                {t.features.map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Link to="/login" className={`btn ${t.highlight ? "primary" : "ghost"}`}>
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="faq">
        <h2 className="section-title">Questions people actually ask</h2>
        <div className="faq-list">
          {faqs.map((f) => (
            <details className="card faq" key={f.q}>
              <summary>{f.q}</summary>
              <p className="muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section final-cta">
        <h2>Your visitors deserve privacy. You deserve answers.</h2>
        <p className="muted">Both, in three minutes.</p>
        <Link to="/login" className="btn primary big">
          Start free — no card needed
        </Link>
      </section>

      <footer className="landing-footer muted">
        ▲ Nano Analytics — self-hosted, privacy-first web analytics
      </footer>
    </div>
  );
}
