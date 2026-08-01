# SaaS Dealer Access — Plan

_Three features for the multi-dealer rollout on `gcnisp.com`:_
1. **Per-dealer subdomains** with pre-login branding (`{slug}.gcnisp.com`)
2. **Per-dealer modules** — you enable only the features each dealer needs, from the owner console
3. **APK via QR code** on the dealer's console (download from Google Drive; no Play Store)

Everything builds on what already exists: row-level tenancy (`dealer_id`), the owner console (create/suspend dealers), per-dealer branding, and login-based isolation. No code is written yet — this is the blueprint.

---

## Feature 1 — Per-dealer subdomains + pre-login branding

**Goal:** each dealer gets a personal, branded entrance (`starnet.gcnisp.com`) they can't casually share to another dealer, with their logo/colour on the **login screen itself** (before sign-in).

### How it works
- **DNS (deployment):** a wildcard `A` record `*.gcnisp.com → VPS IP`, so every `{slug}.gcnisp.com` resolves. Apex `gcnisp.com` = the marketing/landing site.
- **Public branding-by-slug (new API):** `GET /public/branding/{slug}` → `{ name, primaryColor, logoUrl }` only (no auth, no private data). The web app calls this on load when it detects a dealer subdomain, and themes the landing/login before login.
- **Hostname detection (frontend):** read `window.location.hostname`.
  - apex / `www` / `app` → marketing landing (GCN Suite).
  - `{slug}.gcnisp.com` → that dealer's branded login (logo, colour, name), marketing trimmed.
  - `localhost` (dev) → a dev switcher.
- **Login binding (security):** on a dealer subdomain, a login only succeeds for a user **belonging to that dealer** (else "This isn't your workspace"). The owner/super-admin can log in anywhere. This is what stops a dealer sharing their URL usefully to another dealer.
- **SEO:** apex is indexable; dealer subdomains are `noindex` (private entrances).

### Pieces to build
| Layer | Work |
|---|---|
| Backend | `GET /public/branding/{slug}` (public, safe subset); optional slug check in `login` |
| Frontend | hostname→slug detection; fetch + apply branding pre-login; branded login variant; `noindex` meta on subdomains |
| Deployment | wildcard DNS + Nginx server block for `*.gcnisp.com` + wildcard TLS (Let's Encrypt) |

> Depends on the VPS + DNS being live to *activate*, but all the code can be built and tested now (via `?dealer=slug` dev override).

---

## Feature 2 — Per-dealer modules (owner-controlled)

**Goal:** you tick, per dealer, exactly which features their workspace shows — Internet, Monthly Register, Kharcha/Expenses, etc. A dealer never sees a module you didn't enable.

### The module registry (proposed)
Toggleable modules (each = a nav group + its pages + its API):

| Key | Label | Includes |
|---|---|---|
| `internet` | Internet subscribers | Customers, Charged Today, Recovery, Log Charge, Quick Payment |
| `monthly` | Monthly Register | Monthly register (+ its edit) |
| `sync` | Portal Sync | Connect Sync (needs portal credentials) |
| `invoices` | Commercial Invoices | Invoice generate + PDF |
| `quotations` | Quotations | Quotation builder + PDF |
| `cable` | TV Cable | Cable subscribers + collection |
| `cashbook` | Cash Book | Cash book |
| `expenses` | Expenses (Kharcha) | Expense entry/report |
| `reports` | Reports | Reports page |
| `topups` | Top-up received | Portal top-up history |
| `staff` | Staff Management | Add/manage staff |

**Always-on core** (never toggleable): Dashboard, Org Settings (+ their branding/profile + APK QR), sign-out.

### Storage
- New `dealers.enabled_modules` (JSON array of keys). Default on provisioning = a sensible starter set (see D1). GCN (dealer #1) and existing dealers → all modules.

### Enforcement (defense in depth)
- **Frontend (visible):** the sidebar shows only enabled modules; visiting a disabled route redirects to the dashboard. The app learns its modules from the auth payload (`me()` / login returns `modules: [...]`).
- **Backend (enforced):** a `module:{key}` middleware on each module's route group — a disabled module's API returns 403 even if called directly. (Roles `admin/operator/viewer` still apply *within* an enabled module.)

### Owner console
- In **Dealer Console → each dealer**, a **Modules** checklist (all keys, tick/untick) → saved via the existing `PUT /admin/dealers/{id}` (extended with `modules`).

### Module relationships ("works best with")
Some modules lean on others. When you tick a module in the console, it **states its recommended companions**, and if any aren't enabled yet it shows a soft nudge with a one-click "add recommended" (advisory, never forced):

| Module | Works best with |
|---|---|
| `monthly` | `internet` |
| `sync` | `internet`, `monthly` |
| `invoices` | `internet` |
| `quotations` | `internet` |
| `topups` | `sync` |
| `reports` | `internet`, `cashbook` |
| `cashbook` | `expenses` |
| `expenses` | `cashbook` |
| `cable` | `cashbook` |
| `internet`, `staff` | (standalone) |

- Stored as a static `RECOMMENDS` map shared by web + mobile (kept next to the module registry).

### Mobile parity (same modules on the app)
The **mobile app reads the identical `modules`** list from the login/`/me` payload and gates its own bottom-nav + "More" menu the same way — so if you enable only 3 modules for a dealer, their staff see only those 3 on the phone too:
- `internet` → Recharges, Recovery, Customers, Record payment
- `monthly` → Monthly Register · `cashbook` → Cash Book · `cable` → TV Cable · `sync` → the Sync button
- Dashboard + profile/sign-out are always-on core.
- Work: add `modules` to the mobile `AuthUser`; filter `home_shell` tabs + `more_screen` items by it.

### Pieces to build
| Layer | Work |
|---|---|
| Backend | `enabled_modules` column + default; `module` middleware; expose `modules` in auth payload; validate + save in dealer update; provisioner default |
| Frontend | modules in `AuthUser`; Sidebar + route filtering by modules; console Modules checklist UI |

---

## Feature 3 — Mobile APK via QR (Google Drive)

**Goal:** each dealer's console shows a **QR code** their staff scan to download the APK from your Google Drive — no Play Store.

### How it works
- **You (owner)** upload the APK to Google Drive → get a shareable **direct-download** link.
- Store it as `dealers.apk_url` (per dealer, so branded builds can differ later; falls back to a global default if empty — see D3).
- Set it in **Dealer Console → each dealer → "Mobile app (APK link)"**.
- **Dealer side:** in their **Settings**, a "Get the mobile app" card renders a **QR code** of that link (generated client-side) + a tap-to-download button. Staff scan → download → install.

### Pieces to build
| Layer | Work |
|---|---|
| Backend | `apk_url` column; save in dealer update; expose to the dealer (via settings/branding payload) |
| Frontend | QR generator (small bundled lib, no external calls); "Get the mobile app" card in Settings; console APK-link input |

> Note: Android will warn on "install from unknown sources" for a sideloaded APK — expected for Drive distribution. A short "how to install" line handles that.

### Confirmed approach + one refinement (agreed with you)
Your plan is right: **you** build & maintain the APK (it'll get regular patch updates) and upload it to Google Drive; you give me the **link**, and it drives the QR. Two things to make it smooth:
- **The QR feature is link-agnostic — I can build it now.** It renders a QR from whatever URL is stored per dealer. It simply shows nothing until you paste a link, then the QR appears. So we don't have to wait; you paste the Drive link when ready.
- **Use a stable link so the QR never has to change on each patch:** on Drive, update the file via **"Manage versions"** (keeps the same file ID / link); and use the **direct-download form** `https://drive.google.com/uc?export=download&id=FILE_ID` rather than the `/view` preview link. (Large APKs can hit Drive's virus-scan interstitial — if that bites, we later host `gcnisp.com/app/latest.apk` on your VPS for a clean, constant, direct link.)

---

## Data model (migrations)
- `dealers.enabled_modules` — JSON (array of module keys)
- `dealers.apk_url` — text, nullable
- (branding-by-slug reuses existing `dealers.slug`, `primary_color`, `logo_url`)

## Suggested build order
1. **Modules** (Feature 2) — biggest day-to-day value, no deployment dependency.
2. **APK QR** (Feature 3) — small, self-contained.
3. **Subdomains** (Feature 1) — build now, *activate* when the VPS + wildcard DNS are live.

## Open decisions (please confirm before we start)
- **D1 — Default modules for a NEW dealer:** all on (you untick what they don't need), or a minimal starter set (Internet + Monthly + Cashbook) you then extend? _(Recommend: all on, you untick.)_
- **D2 — Subdomain login binding:** hard (reject a user who doesn't belong to that subdomain's dealer) or soft (allow, just branded)? _(Recommend: hard — that's what makes the personal URL "unshareable".)_
- **D3 — APK link:** per-dealer link (for future branded APKs) with a global fallback, or a single shared APK link for everyone right now? _(Recommend: per-dealer field + global fallback.)_
- **D4 — Cash Book vs Expenses:** one combined `cashbook` module, or split `cashbook` + `expenses` (Kharcha) as you listed them? _(Recommend: split, since you named Kharcha separately.)_
