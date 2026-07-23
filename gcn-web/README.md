# GCN — ISP Subscriber Management (Web front-end)

React + Vite + TypeScript + Tailwind v4 front-end for the Global Cable Network
subscriber management system. **Phase: UI only** — every screen reads through a
mock API layer so it can later swap to the Laravel/Sanctum backend with no screen
changes.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Structure

```
src/
  types.ts                 Domain types (mirror the locked data model)
  data/mock.ts             Seeded mock data (providers, accounts, packages, ~72 customers, charges, payments, invoices)
  services/api.ts          API service layer — SWAP THIS FILE for real fetch() calls later
  lib/                     format helpers + useApi hook
  components/
    Logo.tsx               GCN wordmark + network-node mark (placeholder — swap for delivered SVG)
    layout/                Sidebar (dark rail), Topbar, AppLayout
    ui/primitives.tsx      Card, Button, PackageTag, StatusBadge, MethodBadge, Avatar…
    CustomerPicker.tsx     Fast type-ahead used by the daily flow
  pages/
    Dashboard  Customers  CustomerDetail  CustomerForm
    LogCharge (the daily loop)  Recovery  Invoices  Reports  Staff  Settings  Login
```

## Design

- **Dark navigation rail + light work area** (MindMeister-inspired).
- **Logo slot** lives at the top of the sidebar, on the login brand panel, and on
  the commercial invoice letterhead. Replace `components/Logo.tsx` when the final
  SVG is delivered — layout and sizing stay put.
- Package **colors are the identity** (Yellow/Orange/Red/Brown/Purple/Green).

## Swapping to the real API

`src/services/api.ts` is the single seam. Replace each method body with a `fetch`
to the Laravel endpoint (attach the Sanctum token). The `useApi` hook and every
page stay unchanged.

## Not yet wired (front-end placeholders)

- Auth is a stub — the login form just navigates to `/`. No token/guard yet.
- Form submits (Add customer, Log charge, Save settings) are optimistic UI stubs.
- PDF export/print buttons are visual — no generator wired.
