# GCN Operations — Running the full stack (dev)

Three parts: **PostgreSQL** (data), **Laravel API** (backend), **React** (frontend).

## Prerequisites (already installed)
- PHP 8.5 · Composer · PostgreSQL 16 (service `postgresql-x64-16`, auto-starts)
- Node.js

## 1. Database
PostgreSQL runs as a Windows service automatically. Connection (dev):
- db `gcn_isp` · user `gcn` · password `GcnDev2026` · superuser `postgres` / `GcnDev2026`

Re-seed from the imported Excel data anytime:
```powershell
cd d:\GCN_ISP\gcn-web ; node scripts/import-xlsx.mjs   # Excel -> seed.json
cd d:\GCN_ISP\gcn-api ; php artisan migrate:fresh --seed
```

## 2. Backend API  (http://127.0.0.1:8000)
```powershell
cd d:\GCN_ISP\gcn-api
php artisan serve
```

## 3. Frontend  (http://localhost:5173)
```powershell
cd d:\GCN_ISP\gcn-web
npm run dev
```

## Login
- Admin: `sheharyar@gcn.pk` / `password`
- Staff: `moin@gcn.pk`, `irshad@gcn.pk`, `umair@gcn.pk`, `nadeem@gcn.pk` / `password`

## Layout
- `gcn-web/` — React + Vite + Tailwind frontend (talks to the API via `src/services/api.ts`)
- `gcn-api/` — Laravel 13 + Sanctum API on PostgreSQL
- `gcn-web/scripts/import-xlsx.mjs` — Excel → seed.json importer
- `gcn-web/scripts/validate-seed.mjs` — data integrity checks
