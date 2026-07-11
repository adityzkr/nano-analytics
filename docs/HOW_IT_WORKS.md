# How It Works — In Plain English

No technical knowledge needed. This explains what Nano Analytics is, what it
does, and how it does it — the way you'd explain it over coffee.

## What is this thing?

Imagine you own a shop. You'd love to know: how many people came in today?
Which aisles did they walk through? Did they come because of the flyer you
posted? Did they buy anything?

Nano Analytics answers those questions for a **website** instead of a shop.
It counts your visitors, shows which pages they look at, tells you where they
came from, and whether they did the things you care about (signed up, bought
something).

Google Analytics is the famous tool for this. Nano Analytics does the same
job, with one big difference: **it doesn't follow people around**. More on
that at the end.

## The three parts

Think of it as three things working together:

**1. The counter at the door.**
A tiny, invisible helper that you add to your website once (your developer
pastes in one line of code). Every time someone opens a page, the helper makes
a note — like a person with a clicker standing at your shop's entrance. It's
so small and quick that visitors never notice it.

**2. The filing cabinet.**
Every note the counter takes gets sent to a filing cabinet (a database).
Each note says: someone viewed *this page*, at *this time*, they came from
*Google*, they used *a phone*, they're in *France*. That's it — no names, no
addresses, nothing personal.

**3. The report screen (the dashboard).**
When you log in, the dashboard opens the filing cabinet, adds everything up,
and shows you charts and numbers: visitors today, most popular pages, where
people came from, how many are on your site *right now*. The adding-up happens
fresh every time you look, so what you see is always current.

## What happens when someone visits your website?

Step by step, in the half-second after a visitor opens your page:

1. Your page loads in their browser, including the tiny helper.
2. The helper jots down: which page, what time, where the visitor came from,
   what kind of device they're using.
3. It sends that note to your analytics server.
4. The server looks up which country the visitor is in, writes the note into
   the filing cabinet, and immediately forgets the visitor's address.
5. Within seconds, your dashboard reflects it — the "online now" number goes
   up by one.

The visitor sees nothing, is asked nothing, and nothing is left behind on
their device.

## What do all the numbers mean?

- **Unique visitors** — how many different *people* came. If one person reads
  five pages, that's one visitor.
- **Page views** — how many *pages* were opened in total. That same person
  reading five pages = five page views.
- **Sessions** — how many *visits*. If someone browses in the morning and
  comes back after dinner, that's one person, two visits. (A visit "ends"
  after half an hour of no activity — the industry-standard rule.)
- **Bounce rate** — the share of visits where someone looked at just one page
  and left. High bounce isn't always bad: if your page answered their
  question, they had no reason to click further.
- **Average session** — how long a visit lasts, on average.
- **Referrers** — which other websites sent people to you ("40 visitors came
  from Google this week").
- **Countries / Devices / Browsers** — who your audience is: where they are
  and whether they're on a phone or a computer.
- **Custom events** — things *you* decided to count, beyond page views: sign-up
  button clicks, purchases, downloads. Your developer adds one line of code
  per thing you want counted.
- **Goals** — a custom event you've declared important. Once you mark
  "purchase" as a goal, the dashboard tells you: "2% of this week's visitors
  bought something."

## Where does the privacy promise come from?

Most analytics tools put a **cookie** on each visitor's device — a little tag,
like writing a number on someone's hand so you recognize them next week.
That's why websites nag you with consent pop-ups.

Nano Analytics doesn't tag anyone. Instead, when a note arrives, the server
computes a scrambled one-way code from the visit itself, uses it to tell "same
person today" from "different person today," and that's all it can do:

- The code **cannot be traced back** to a person or their address.
- The code **changes every day**, so yesterday's visitor and today's are
  unlinkable — even if they're the same person.
- The visitor's internet address is used for a moment (to work out the
  country) and then **thrown away, never stored**.

The honest trade-off: if the same person visits every day for a week, the
dashboard counts seven visitors, not one. You lose a bit of accuracy and gain
the right to say "we don't track people."

## Who can see my data?

Only you. You log in with your email and password, and you can only ever see
the sites registered under your own account. Every site you add gets its own
dashboard — data from different sites is never mixed.

## Want the technical version?

- Developers integrating tracking into a site: see the
  [User Manual](USER_MANUAL.md), sections marked "for your developer."
- Engineers who want the internals (databases, code structure, design
  decisions): see [ARCHITECTURE.md](ARCHITECTURE.md).
