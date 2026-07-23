# GCN — Global Cable Network ISP Management System

A subscriber-management platform for a Pakistani ISP + cable operator, replacing a
manual per-month Excel workflow. Tracks internet subscribers across multiple upstream
portals (Connect resellers + in-house Fiber), TV-cable customers, daily recharges,
arrears/recovery, and the cash book (kharcha) — with a scraper that pulls each portal's
recharges and dashboard live.

Built to be sold as a SaaS to other dealers.

## Stack

| Layer | Tech |
|-------|------|
| **API** | Laravel 13 · PHP 8.5 · Sanctum (Bearer tokens) · PostgreSQL 16 |
| **Web** | React 19 · Vite · TypeScript · Tailwind CSS v4 |
| **Mobile** | Flutter (in progress) |
| **Scraping** | Guzzle — Connect (`connect.net.pk`) + Fiber Beam (`billing.fiber-beam.net`) |

## Repository layout

```
gcn-api/     Laravel API (controllers, models, migrations, portal scrapers)
gcn-web/     React admin web app
gcn_mobile/  Flutter mobile app (in progress)
```

## Features

- **Dashboard** — live portal snapshot (subscriber counts, online/offline, wallet), collection KPIs, recovery.
- **Charged Today** — staged portal recharges reviewed and added to the ledger by hand.
- **Monthly Register** — every user billed per month (package, charge date, amount, payment, balance).
- **Recovery** — arrears list, most-recent dues first, with a 2+ month overdue warning.
- **Cash Book** — monthly kharcha sheets, profit after cost & expenses.
- **Roles** — admin / operator / viewer, enforced server-side (viewers are read-only with a limited view).
- **Portal sync** — nightly + on-demand scrape of Connect & Fiber Beam recharges and dashboard stats.

## Running locally

See [HOW-TO-RUN.md](HOW-TO-RUN.md). In short:

```bash
# API
cd gcn-api && composer install && php artisan migrate --seed && php artisan serve
# Web
cd gcn-web && npm install && npm run dev
```

## Notes

- **Secrets** (`.env`, portal credentials, DB password) are git-ignored — copy `.env.example` and fill in.
- **Customer data** (the raw monthly spreadsheets and the generated `seed.json`) is git-ignored on purpose — it holds real subscriber PII. Regenerate the seed locally from your Excel files.
