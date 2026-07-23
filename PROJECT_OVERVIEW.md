# GCN — ISP Subscriber Management System

**Global Cable Network (GCN)** — a full-stack web platform that replaced a manual,
multi-file Excel workflow for running an Internet Service Provider (ISP), TV cable
business, and expense book. Built to manage **300–400+ active subscribers** across
multiple ISP accounts, with automated nightly billing sync from upstream provider
portals. Designed from the ground up to be productized and sold to other dealers as a
**SaaS**.

> **Role:** Sole designer & full-stack developer — product design, database modeling,
> API, front-end, data migration, and portal-integration/web-scraping.

---

## Elevator pitch (CV-ready)

> Designed and built a full-stack ISP subscriber-management SaaS (Laravel + PostgreSQL
> API, React/TypeScript SPA) that replaced a 6-year manual Excel workflow. Migrated
> ~850 internet subscribers, ~850 cable subscribers, and 3,000+ expense records from 67
> monthly spreadsheets into a normalized relational schema with guaranteed
> ledger-to-balance reconciliation. Automated daily billing by reverse-engineering and
> scraping two upstream provider portals (Connect & Fiber Beam), capturing per-recharge
> cost-vs-billed margin. Shipped role-based auth, PDF commercial invoicing, an
> arrears/recovery engine, and an animated analytics dashboard.

---

## Business problem solved

The operator previously tracked everything in **one Excel file per month since 2020**
(67 files across three separate business domains). This meant:

- Balances were calculated by hand and frequently drifted (a subscriber's carried
  arrears wouldn't roll into the next month correctly).
- No visibility into who was overdue, by how much, or for how many months.
- Every subscriber recharge on the upstream ISP portals had to be **re-typed by hand**
  into the spreadsheet each day.
- No way to see profit margin (portal cost vs. the price billed to the customer).

The system centralizes all of this into a single source of truth with an auditable
ledger, automated data entry, and a dashboard that answers "who owes me money and how
do I collect it."

---

## Core modules

### 1. Internet subscriber management
- Full CRUD for residential & commercial subscribers (login ID, house #, sector, phone,
  package/speed, billing address).
- Multi-account support — a subscriber can be moved between ISP accounts (e.g.
  **GCNDIGITAL, MRGNET, Fiber ISP**) while **collection history survives the switch**.
- Per-subscriber **ledger** (every charge and payment) with pagination, newest-first
  ordering.
- Search by house number, sector, name, or login ID.

### 2. Daily charge + payment logging
- A fast "log charge + payment" flow for daily office work.
- **Payment-only ("collect arrears") mode** — record cash received against outstanding
  dues without forcing a new monthly charge.
- Accurate charge-date handling (reflects the actual day a card was charged, not the
  entry date).

### 3. Automated portal sync (web scraping)
- Nightly (2 AM) automated job logs into **two different upstream provider portals** and
  imports the day's recharges as charges — **zero manual typing**.
  - **Connect** portal — handled dynamically-hashed form field names + per-session CSRF
    tokens parsed fresh on each login.
  - **Fiber Beam** portal — AJAX report endpoint requiring specific
    `X-Requested-With`/`Referer` headers and a relaxed TLS chain.
- **Margin capture** — the portal's charge amount is stored as *cost*, the customer's
  GCN price as *billed*, so gross margin is computed automatically.
- **Human-in-the-loop verification** — a recharge is imported as a *charge only*;
  payment is **never auto-assumed**. Staff confirm each one as paid (Cash / JazzCash /
  Bank) on the **Charged Today** screen once money physically arrives — a deliberate
  fraud/verification control.
- Robust sync review: duplicate detection, unmatched-user flagging, unmapped-speed
  flagging — bad rows are surfaced for review and **never silently written to the
  ledger**.
- Credentials stored in environment config (never committed) so the connectors are
  multi-tenant-ready for SaaS resale.

### 4. Charged Today
- Dedicated screen listing every card charged today (from manual logging *and* the
  portal sync), newest first, showing id, name, house #, sector, package/speed, amount,
  and previous balance.
- Per-row one-click **Mark Paid** (Cash / JazzCash / Bank / Other) with a paid badge and
  an undo action. Toggling paid/unpaid adjusts the customer's balance transactionally.
- Filter tabs (All / Unpaid / Paid) plus a daily collected-vs-total summary.

### 5. Arrears & recovery engine
- Automatically tracks **months overdue** for each subscriber (outstanding ÷ monthly
  fee).
- **Recovery list** prioritized by arrears depth and amount owed.
- Warning surfaced for any subscriber carrying **2+ consecutive months** of balance.

### 6. Commercial invoicing
- Generates branded **PDF invoices** on GCN letterhead for commercial subscribers
  (dompdf), fetched over authenticated Bearer requests and opened client-side.

### 7. TV Cable module
- Separate business domain (the "Office Book") with its own subscribers, monthly fees,
  balances, and payment ledger.

### 8. Cash Book (expenses)
- Expense/`Kharcha` tracking with categories, payee, and source-of-funds.
- Monthly financials: net income, cable income, portal cost, spend, and **profit** —
  plus breakdowns by category and by person.

### 9. Analytics dashboard
- Animated, count-up KPI tiles (collected this month/today, total outstanding, active
  subscribers, overdue count) — each a drill-down link.
- 6-month collection **trend chart** with hover tooltips, per-account collections,
  and a payment-method breakdown.
- Time-based greeting and a compact "charged today" summary.

### 10. Staff & access control
- Role-based access — **admin / operator / viewer**.
- Admin-only staff management; write operations restricted to admin + operator.
- Login throttling and an **audit log** of sensitive actions.

---

## Engineering highlights

- **Data migration at scale** — wrote a SheetJS-based importer that parsed **67 monthly
  Excel files (2020–2026)** across three business domains into a seed pipeline: ~850
  internet subscribers, ~850 cable subscribers, and **3,136 expense records**. Derived
  each subscriber's typical charge day from their real history and handled dirty data
  (blank cells, legacy package names, invalid dates like `2021-02-29`).
- **Guaranteed ledger integrity** — enforced the invariant that a subscriber's
  outstanding balance *always* equals Σcharges − Σpayments. Introduced synthetic
  "opening balance" entries so all ~850 migrated ledgers reconcile to zero mismatches.
- **Reverse-engineered two undocumented provider portals** — session/CSRF handling,
  dynamically-hashed field names, AJAX auth headers, and TLS-chain workarounds, driven
  entirely from configuration for multi-tenant reuse.
- **Performance** — removed dead mock data and tightened the bundle from **6.6 MB → ~380
  KB** (~108 KB gzipped).
- **Correctness fixes** rooted in real accounting bugs — balances double-counting the
  current month, payments not clearing dues, and charge-date drift — each traced to its
  root cause and fixed against the ledger invariant.

---

## Technology stack

| Layer | Technology |
|-------|-----------|
| **Front-end** | React 19, TypeScript, Vite, Tailwind CSS v4, React Router, lucide-react |
| **Back-end** | Laravel 13 (PHP), Sanctum token auth (Bearer) |
| **Database** | PostgreSQL 16 |
| **Integrations** | Guzzle HTTP + cookie jar for portal scraping; dompdf for PDF invoices |
| **Data pipeline** | SheetJS (xlsx) Excel importer → JSON seed → Laravel seeders |
| **Scheduling** | Laravel task scheduler (nightly sync, `withoutOverlapping`) |
| **Auth/security** | Role-based middleware, login rate-limiting, audit logging, env-based secrets |

**Architecture:** decoupled SPA + REST API. Stateless Bearer-token auth (not
cookie/session), reference-data caching on the client, and config-driven connectors so
the same codebase can serve multiple dealers.

---

## Roadmap

- Flutter mobile app for field collection.
- Production deployment (Hostinger) over HTTPS with a real cron driving the nightly sync.
- Invoice edit/delete and sync review-actions (link an unmatched portal user, backfill
  history).
- Full multi-tenant SaaS onboarding for reselling to other ISP dealers.

---

*Built end-to-end — product design through data migration, API, front-end, and
provider integrations.*
