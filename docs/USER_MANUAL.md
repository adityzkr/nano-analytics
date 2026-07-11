# User Manual

A step-by-step guide to using Nano Analytics. Written for everyone — the few
parts that need a programmer are clearly marked **👩‍💻 for your developer**.

New here? Read [How It Works](HOW_IT_WORKS.md) first — it explains the whole
idea in plain English in five minutes.

---

## 1. Create your account

1. Open the dashboard in your browser (on your own computer:
   http://localhost:5173).
2. Click **Sign up**. Enter your email and a password (at least 8 characters).
3. Done — you're in, and you'll stay signed in on this browser for 30 days.

To sign out, click **Log out** in the top-right corner.

## 2. Add your website

Each website you want to measure is added once, as a "site."

1. Click **+ Add site**.
2. **Site name** — any label you like, e.g. "My Blog."
3. **Domain** — your website's address, e.g. `myblog.com` (no need for
   `https://`).
4. Click **Create**, then click the new card that appeared.

You'll see setup instructions — that's the next step.

## 3. Connect your website

Your website needs the tiny "counter at the door" installed once. The screen
you're now looking at (the **setup wizard**) shows exactly what to install,
in three flavors. You don't need to understand the code — just get it to
whoever maintains your website.

> **👩‍💻 for your developer**
>
> Pick the tab that matches the site:
>
> - **Script tag** — any ordinary website, WordPress, or server-rendered app.
>   Paste the one-line `<script>` tag (shown in the wizard, with the correct
>   site ID already filled in) into the `<head>` of every page or the shared
>   layout.
> - **React** — `npm install` the `nano-analytics` package and call
>   `init({ siteId, host })` once at startup (e.g. in `main.tsx`).
> - **Next.js** — same package; the wizard shows a ready-made client
>   component to drop into your root layout.
>
> Page views and route changes (including single-page-app navigation) are
> tracked automatically. Nothing else to wire up.

The wizard shows **"Waiting for the first event from your site…"** — leave it
open, visit your website in another tab, and within a few seconds the wizard
disappears and your dashboard comes alive. If it doesn't, see
[Troubleshooting](#7-if-something-doesnt-work).

## 4. Reading your dashboard

At the top right you choose the time window: **Last 24 hours**, **Last 7
days**, or **Last 30 days**. Every number and chart follows your choice —
except the Realtime panel, which always shows "right now."

### The Realtime panel (top of the page)

- **"N online"** (green dot) — how many people are on your site at this
  moment (active in the last 5 minutes).
- **The green bar chart** — activity minute by minute for the last half hour.
- **"Pages being viewed now"** — which pages those people are reading.

It refreshes itself every few seconds. Great for watching a newsletter go out.

### The six numbers

| Number | What it tells you |
| --- | --- |
| **Unique visitors** | How many different people came. One person reading ten pages = 1 visitor. |
| **Page views** | How many pages were opened in total. That same person = 10 page views. |
| **Sessions** | How many *visits*. Morning visit + evening visit by the same person = 2 sessions. A visit ends after 30 quiet minutes. |
| **Bounce rate** | Out of all visits, the percentage that looked at one page and left. Not automatically bad — sometimes one page is all they needed. |
| **Avg session** | How long a typical visit lasted. |
| **Custom events** | How many times your special counted actions happened (sign-ups, purchases — see section 6). |

### The big chart

Your traffic over time — purple area is page views, green line is visitors.
Hover over any point for exact numbers.

### The smaller cards

Each shows a top-10 list for your chosen time window:

- **Top pages** — your most-read pages.
- **Referrers** — which other websites sent people to you. If someone typed
  your address directly or used a bookmark, they don't appear here.
- **UTM sources** — results of your marketing campaigns. When you share a link
  like `myblog.com/?utm_source=newsletter`, visitors arriving through it are
  counted under "newsletter." (UTM is just a naming convention for links —
  ask whoever runs your campaigns.)
- **Custom events** — your counted actions, by name.
- **Browsers / Operating systems / Devices** — what your audience uses.
  "Devices" means desktop, mobile, or tablet.
- **Countries** — where your visitors are.

## 5. More than one website?

Add as many sites as you like. The home screen shows one card per site with
its last-24-hours visitor count. Each site's data is completely separate, and
nobody but you can see any of it.

## 6. Counting the actions you care about (goals)

Page views tell you people *came*. Goals tell you whether they *did the
thing* — signed up, purchased, downloaded.

**Step 1 — count the action.** Your website has to announce the action once,
when it happens.

> **👩‍💻 for your developer**
>
> Call `window.nano.track("signup")` (script-tag install) or
> `track("signup")` (npm SDK) at the moment of success — e.g. on the
> "welcome aboard" page. Keep names short and stable: `signup`, `purchase`,
> `newsletter_subscribe`.

**Step 2 — declare it a goal.** On the dashboard, find **Goals &
conversions**, type a friendly name ("Signed up") and the event name from
step 1 (`signup`), and click **Add goal**.

**Step 3 — read the results.** For your chosen time window the table shows:

- **Conversions** — how many times it happened.
- **Converters** — how many different people did it.
- **Rate** — the percentage of all visitors who did it. "3%" means 3 out of
  every 100 visitors signed up.

Removing a goal (the ✕) only removes the row from this table — no data is
lost, and you can add it back any time.

## 7. If something doesn't work

**The wizard keeps saying "waiting…"**
- Most common cause: the code isn't on the website yet, or it carries the
  wrong site ID. Click **Install snippet** and compare carefully.
- Testing on your own machine? The snippet's address (`localhost`) only works
  on that same machine. A real, public website needs the analytics server on
  a real, public address too.
- **Ad blockers block analytics** — including this one. Try a private browser
  window with the blocker turned off.

**My numbers are lower than my hosting provider's.** Hosting providers count
bots and crawlers; Nano Analytics counts only real people in real browsers.
Lower — and more truthful.

**I keep refreshing my own site but "Unique visitors" stays at 1.** Correct!
You're one person. Refresh all you like — see the privacy note below.

**A new page on my site isn't listed under Top pages.** Pages appear the
moment their first visitor arrives. No setup needed — publish and wait.

**My sign-up event isn't showing.** Event names must match exactly —
`signup` and `Signup` are different. Ask your developer to double-check the
spelling on both sides.

## 8. The privacy promise, in one box

What is stored about a visit: page address, time, the website they came from,
browser and device type, country, and an anonymous daily code.

What is **never** stored: names, email addresses, internet (IP) addresses,
cookies, or anything that could identify a person or follow them from one day
to the next.

That's why you can use Nano Analytics without cookie banners, and why a daily
regular shows up as a "new" visitor each day — the tool is physically unable
to recognize them. That's the feature.
