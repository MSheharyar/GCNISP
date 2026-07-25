# GCN SaaS — Landing Page Plan

_Plan for the public page shown **before login**, for both the GCN flagship and any dealer's own URL. Owner: you (super-admin). Goal: market the system as a SaaS product to other ISP/cable operators, while giving existing dealers a clean, branded way in._

---

## 1. What this page is (and isn't)

**It is** the first screen a visitor sees at the root URL — a marketing + entry page that (a) pitches the product to prospective dealers and (b) routes existing users to login.

**It is not** the app. The authenticated dashboard stays behind login exactly as today. No customer data, no real numbers, nothing tenant-specific is exposed on this public page.

### The core insight: one page, two audiences
The same URL is hit by two very different people, so the page adapts based on **how it was reached**:

| Visitor | Reaches via | Should see |
|---|---|---|
| **Prospective dealer** (lead) | Main marketing domain (e.g. `gcnsuite.pk` / `getgcn.pk`) | Full marketing pitch + "Request access" + a small "Dealer login" link |
| **Existing dealer's staff** | Their personal URL (e.g. `starnet.gcnsuite.pk`) | Their **branded** splash (their logo + colour + name) with a prominent **Login** — marketing trimmed to a short strip |
| **GCN's own staff** | GCN's URL | Same as a dealer: GCN-branded splash → login |

> **Decision needed (D1):** Confirm the marketing domain vs. the per-dealer subdomain scheme. The plan assumes `apex domain = marketing`, `{slug}.domain = dealer entry`. This drives the "which mode" logic in §5.

---

## 2. Positioning & message

**Product name (working):** GCN Suite — _ISP & Cable billing, without the Excel._

**One-line pitch:**
> Run your internet + cable business from one screen — auto-import portal recharges, chase recovery, collect payments, and send WhatsApp receipts. Web + mobile.

**Who it's for:** Small/mid ISP resellers and cable operators (300–2,000 subscribers) in Pakistan who today juggle Excel sheets, portal logins, and a cash register.

**The three promises (the spine of the page):**
1. **Stop reconciling by hand** — auto-sync recharges from Connect & Fiber Beam portals into a daily activity feed, with your margin (cost vs. price) tracked automatically.
2. **Get paid** — a live recovery list of who's overdue, one-tap collection, and instant WhatsApp receipts.
3. **See the whole business** — dashboard, monthly register, cash book, expenses, and professional PDF invoices — on web and on your phone.

---

## 3. Page sections (top → bottom)

Marketing mode shows all of these; dealer-branded mode shows only the **Hero (branded) + Login** and a slim footer.

1. **Top bar** — logo/wordmark (branded per mode), a `Features / How it works / Pricing / FAQ` anchor nav, and a **Login** button (always top-right).
2. **Hero** — headline + sub-headline + primary CTA (**Request access**) + secondary (**See how it works**). Right side: a clean product screenshot/mockup (dashboard or "Charged today"). In dealer mode this becomes "Welcome to {Dealer} — Login".
3. **Trust strip** — "Built for Connect & Fiber Beam resellers" + small logos/labels of what it connects to; a stat line ("Manages 850+ live subscribers at GCN").
4. **Problem → Solution** — 3 pain points (Excel chaos, manual portal reconciliation, chasing arrears) each paired with the feature that kills it.
5. **Feature grid** (6–8 cards, icon + title + one line):
   - Auto portal sync (Connect + Fiber Beam)
   - Charged-today activity feed
   - Recovery / arrears tracking
   - Payments + WhatsApp receipts
   - Cash book & expenses
   - Monthly register
   - Commercial PDF invoices
   - TV cable subscribers
   - Staff roles (admin / operator / viewer)
   - Margin tracking (cost vs. price)
6. **"How it works"** — 3 steps: _We set up your workspace → You enter customers (or we import) → You collect & we auto-sync recharges nightly._ Reinforces that **you (owner) approve and provision each dealer**.
7. **Web + Mobile** — show both surfaces; "Manage from the office, collect from the field."
8. **Pricing** — simple monthly SaaS framing. Start with a single plan + "Contact for volume". _(See D2.)_
9. **Testimonial / proof** — quote from GCN as the flagship user (real, since you run it).
10. **FAQ** — data ownership, what portals are supported, can they use other portals (yes — manual + own packages), onboarding time, can branding be customised (yes, by you), security/isolation.
11. **Final CTA band** — "Ready to run your ISP without Excel? → Request access."
12. **Footer** — product, contact/WhatsApp, small print, and a **Dealer login** link.

---

## 4. Lead capture & onboarding flow

Because **only you approve/provision dealers**, the public CTA is **not** self-signup. It's a lead form:

- **"Request access"** opens a short form: _Business name, contact person, WhatsApp number, city, approx. subscribers, which portal(s)._
- Submitting → stored + notifies you (email/WhatsApp). No account is created.
- You review → create the dealer + admin in the **owner console** (already built) → send them their personal URL + temp password (+ APK).
- Optional later: a "Book a demo" calendar link.

> **Decision needed (D3):** Where do leads go? Options: (a) a new `leads` table + `POST /public/leads` endpoint + a "Leads" tab in the owner console; (b) email only via a form service; (c) WhatsApp deep-link prefilled. Recommend **(a)** so leads live in the same system you already log into.

---

## 5. How it fits the current app (technical)

**Routing (React Router, `gcn-web`):**
- Today: `/` = Dashboard behind `RequireAuth`; unauthenticated → bounced to `/login`.
- New: make `/` the **public landing** (no auth). Move the authenticated app under the existing routes but change the redirect: an unauthenticated hit on an app route → `/login`; a visit to `/` while **logged in** → show a "Go to dashboard" button (don't force-redirect, so marketing stays reachable).
- `/login` stays as-is but gains the branded splash treatment.

**Mode detection (marketing vs dealer-branded):**
- Read `window.location.hostname`. Apex/`www` → marketing mode. `{slug}.domain` → dealer mode.
- For dealer mode, fetch a **public, unauthenticated branding-by-slug** endpoint so the splash shows the right logo/colour **before** login. _New:_ `GET /public/branding/{slug}` → `{ name, primaryColor, logoUrl }` (safe subset; never anything tenant-private). Reuse the existing `lib/branding.ts` ramp logic to theme the page.
- Local/dev (`localhost`) → marketing mode with a dev switcher.

**Components (new, under `gcn-web/src/pages/landing/` + `components/landing/`):**
- `Landing.tsx` (orchestrates sections + mode), `Hero`, `FeatureGrid`, `HowItWorks`, `Pricing`, `FAQ`, `LeadForm`, `LandingNav`, `LandingFooter`.
- Reuse existing design tokens (`index.css` brand ramp, `ink`/`canvas` surfaces) and the `Logo` component (already branding-aware).

**Non-negotiables:**
- Fully **responsive** (mobile-first — dealers browse on phones).
- **Theme-aware** using the same tokens; dealer mode themes from their colour.
- **No secrets, no PII, no real customer numbers** on the public page. Stats are either hard-coded marketing figures or an aggregate you approve.
- **SEO** for the marketing domain only: title, meta description, OpenGraph image, sitemap. Dealer subdomains should be `noindex` (they're private entrances).
- Fast: static assets, lazy-load screenshots, no auth calls in marketing mode.

---

## 6. Visual direction

- Keep the existing product aesthetic (navy `ink` + brand blue, clean cards, subtle motion via `.animate-rise`) so the landing feels continuous with the app.
- Hero uses a real product screenshot (Dashboard + "Charged today") in a browser/phone frame — **use mocked/blurred data**, never a live tenant.
- Light + dark friendly; dealer mode swaps the brand colour + logo + wordmark automatically.
- Iconography: reuse `lucide-react` (already a dependency).

---

## 7. Assets needed

- [ ] Product name + logo finalised (marketing brand vs GCN brand)
- [ ] 2–3 clean screenshots (dashboard, charged-today, mobile) with mock data
- [ ] Short feature copy (owner to approve tone — English, or English+Urdu?)
- [ ] Pricing numbers (D2)
- [ ] Contact/WhatsApp number for the CTA
- [ ] OG/social preview image + favicon

---

## 8. Build phases

- **Phase A — Marketing MVP:** public `/` marketing page (all sections, static copy), `/login` untouched, "Request access" opens a form that (for now) emails/WhatsApps you. Deployable immediately.
- **Phase B — Lead capture in-system:** `leads` table + `POST /public/leads` + "Leads" tab in owner console.
- **Phase C — Dealer-branded mode:** hostname detection + `GET /public/branding/{slug}` + themed splash on dealer subdomains, `noindex`.
- **Phase D — Polish:** SEO/OG, real screenshots, testimonial, analytics (page views + form conversions), A/B on the hero CTA.

---

## 9. Open decisions (please confirm before Phase A)

- **D1 — Domain scheme:** apex = marketing, `{slug}.domain` = dealer entry? Or a single domain where dealers use a path like `/d/{slug}`?
- **D2 — Pricing:** show a number publicly, or "Contact for pricing"? If a number: one flat monthly plan, or tiered by subscriber count?
- **D3 — Leads destination:** in-system `leads` table (recommended), email only, or WhatsApp deep-link?
- **D4 — Product name/brand:** market under a neutral SaaS name (e.g. "GCN Suite") or under "GCN"? Affects logo + copy.
- **D5 — Language:** English only, or English + Urdu toggle?
- **D6 — Self-signup ever?** Confirmed **no** for now (you approve every dealer) — the CTA is "Request access", not "Sign up".

---

_When decisions D1–D6 are set, I'll start Phase A (the marketing MVP) — it ships without touching the existing app or any tenant data._
