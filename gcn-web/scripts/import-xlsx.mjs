// GCN Excel → seed.json importer.
// Parses the real monthly workbooks (Internet / Cable / Cash-book) into the
// app's data shapes so the front-end runs on real records. Re-run any time.
import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Recursively collect .xlsx files (they're organised in year subfolders).
function walkXlsx(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkXlsx(full));
    else if (/\.xlsx$/i.test(entry) && !/^~\$/.test(entry)) out.push(full);
  }
  return out;
}

// Prefer the full "Excel Files" folder; fall back to the sample set in the root.
const CANDIDATE_DIRS = ['d:/GCN_ISP/Excel Files', 'd:/GCN_ISP'];
const DIR = CANDIDATE_DIRS.find((d) => existsSync(d)) ?? 'd:/GCN_ISP';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'seed.json');

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_TOKENS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sept: 9, sep: 9, oct: 10, nov: 11, dec: 12,
};

// Derive {period, ym} from a filename like "GCN Apr-22", "GCN September-2023", "Sept2025"
function parseFileMonth(name) {
  const n = name.toLowerCase().replace(/\.xlsx$/, '');
  let month = null, best = 0;
  for (const [k, v] of Object.entries(MONTH_TOKENS)) if (n.includes(k) && k.length > best) { best = k.length; month = v; }
  let year = null;
  const y4 = n.match(/20\d{2}/);
  if (y4) year = Number(y4[0]);
  else {
    const y2 = n.match(/[-_ ](\d{2})(?=\D|$)/) || n.match(/(\d{2})(?=\.|$)/);
    if (y2) year = 2000 + Number(y2[1]);
  }
  if (!month || !year) return null;
  return { period: `${MONTHS_FULL[month - 1]} ${year}`, ym: `${year}-${String(month).padStart(2, '0')}` };
}

// Auto-discover all GCN monthly workbooks (recursively), chronologically ordered.
const FILES = walkXlsx(DIR)
  .map((fullPath) => ({ fullPath, file: path.basename(fullPath), ...(parseFileMonth(path.basename(fullPath)) || {}) }))
  .filter((f) => f.ym && /^gcn /i.test(f.file)) // skip non-GCN files (e.g. balance snapshot)
  .sort((a, b) => a.ym.localeCompare(b.ym));

const MAX_YM = FILES.reduce((m, f) => (f.ym > m ? f.ym : m), '2020-01');
// A customer last seen more than ~2 months before the newest file is treated as churned.
function ymMinus(ym, months) {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) - months;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}
const ACTIVE_CUTOFF = ymMinus(MAX_YM, 2);
console.log(`Discovered ${FILES.length} files: ${FILES[0]?.ym} → ${MAX_YM}`);

const norm = (v) => String(v ?? '').trim();
const low = (v) => norm(v).toLowerCase();

// Excel serial or dd/mm/yyyy string → ISO yyyy-mm-dd (fallback to given ym)
function toISO(val, ym) {
  const s = norm(val);
  if (!s || s === '--') return null;
  if (/^\d{4,5}$/.test(s)) {
    // Excel serial date (1900 system, incl. the 1900 leap-year bug baseline)
    const dt = new Date(Date.UTC(1899, 11, 30) + Number(s) * 86400000);
    if (!isNaN(dt.getTime())) {
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
    }
  }
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  // bare day number → attach to the file's month
  if (/^\d{1,2}$/.test(s) && ym) return `${ym}-${String(s).padStart(2, '0')}`;
  return null;
}

const toNum = (v) => {
  const s = norm(v).replace(/[, ]/g, '');
  if (s === '') return null; // blank cell is "no value", not 0
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Some sheets carry stale/typo'd dates; keep them tethered to the file's month
// and always return a REAL calendar date (day clamped to the month's length —
// e.g. a grafted "2021-02-29" becomes "2021-02-28").
function clampToMonth(iso, ym) {
  if (!iso) return null;
  let mo = iso.slice(0, 7);
  if (mo < ym || mo > MAX_YM) mo = ym;
  const [y, m] = mo.split('-').map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  const day = Math.min(maxDay, Math.max(1, Number(iso.slice(8, 10)) || 1));
  return `${mo}-${String(day).padStart(2, '0')}`;
}

// Normalise sector: strip "33/" prefix, unify spacing/case
function normSector(v) {
  let s = norm(v).replace(/^33\//i, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^st-?/i, 'St-');
  if (/^18$/.test(s)) s = 'St-18';
  if (/^19$/.test(s)) s = 'St-19';
  return s || '—';
}

// Canonicalise package names: merge case variants, drop non-package junk.
const PKG_CANON = { yellow: 'Yellow', orange: 'Orange', red: 'Red', brown: 'Brown', purple: 'Purple', green: 'Green', blue: 'Blue' };
const PKG_JUNK = new Set(['balance', 'onu', 'router', '']);
function normPkg(raw) {
  const p = norm(raw);
  const lp = p.toLowerCase();
  if (PKG_JUNK.has(lp)) return null;
  return PKG_CANON[lp] || p;
}

const ACCOUNT_BY_FROM = {
  gcndigital: { id: 1, name: 'GCNDIGITAL' },
  mrgnet: { id: 2, name: 'MRGNET' },
  ispfiber: { id: 3, name: 'Fiber ISP' }, // in-house Fiber (N2 sheet, 2026+)
  fiber: { id: 3, name: 'Fiber ISP' },
  fiberisp: { id: 3, name: 'Fiber ISP' },
  transworld: { id: 4, name: 'Transworld' },
};
const isConnect = (accId) => accId === 1 || accId === 2; // Connect reseller accounts carry wholesale cost
const unknownFrom = new Map(); // track any provider label we don't recognise

function isMainHeader(rows) {
  return low((rows[0] || [])[0]).startsWith('s#');
}

// ── Accumulators ─────────────────────────────────────────────────────────
const custMap = new Map(); // id(lower) → customer
const charges = [];
const payments = [];
let chargeId = 1;
let paymentId = 1;
// Dedup key `customerId:serviceMonth` → one charge/payment per customer per
// billing month. The monthly sheets carry the same charge forward (and back-fill
// its payment date) across files, so without this the same payment is counted
// once per file it appears in. Files are walked chronologically, so latest wins —
// the most recent sheet holds the up-to-date paid/unpaid status.
const chargeMap = new Map();

const cableMap = new Map(); // house|sector → cable customer
const cableEntries = [];
let cableSeq = 1;

const expenses = [];
let expId = 1;

const pkgSeen = new Map(); // package name → count + amounts

// ── Parse each workbook ──────────────────────────────────────────────────
for (const { fullPath, period, ym } of FILES) {
  const wb = XLSX.read(readFileSync(fullPath), { type: 'buffer' });

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
    const nmeLower = sheetName.toLowerCase();

    // ---- FC: fiber/cable tracked by house+sector w/ monthly fee + multi-month
    // payments. Cable-level pricing, no login ID → import as cable customers.
    if (nmeLower === 'fc') {
      const H = (rows[0] || []).map(low);
      const iName = H.indexOf('name');
      const iH = H.indexOf('house #') >= 0 ? H.indexOf('house #') : H.indexOf('house#');
      const iSec = H.indexOf('sector') >= 0 ? H.indexOf('sector') : H.indexOf('sec');
      const iMonthly = H.indexOf('monthly');
      const iBalance = H.indexOf('balance');
      // (amount,date) payment pairs: the first Amount/Date, then Amount Mar/Date, Amount Apr/Date…
      const payPairs = [];
      H.forEach((h, i) => { if (/^amount/.test(h)) payPairs.push([i, H[i + 1] === 'date' ? i + 1 : -1]); });
      if (iH < 0) continue;
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const house = norm(row[iH]);
        if (!house) continue;
        const sector = normSector(row[iSec]);
        const key = `${house}|${sector}`.toLowerCase();
        const monthly = toNum(row[iMonthly]);
        const cc = cableMap.get(key) || {
          id: cableMap.size + 1, name: (iName >= 0 && norm(row[iName])) || undefined,
          houseNo: house, sector, monthlyFee: monthly || 400, balance: 0, status: 'active', lastPaidDate: `${ym}-01`,
        };
        if (iName >= 0 && norm(row[iName])) cc.name = norm(row[iName]);
        if (monthly) cc.monthlyFee = monthly;
        const bal = toNum(row[iBalance]);
        if (bal != null) cc.balance = bal;
        cableMap.set(key, cc);
        for (const [ai, di] of payPairs) {
          const amt = toNum(row[ai]);
          if (amt == null || amt <= 0) continue;
          const date = di >= 0 ? clampToMonth(toISO(row[di], ym), ym) || `${ym}-01` : `${ym}-01`;
          cc.lastPaidDate = date;
          cableEntries.push({ _key: key, id: cableSeq++, date, kind: 'payment', label: `${period} collection`, amount: amt, note: 'FC' });
        }
      }
      continue;
    }

    // ---- Internet (main) sheet ----
    if (isMainHeader(rows)) {
      const H = (rows[0] || []).map(low);
      const col = (name) => H.indexOf(name);
      const iName = col('name');
      const iId = col('id');
      const iH = col('h#');
      const iSec = H.indexOf('sec') >= 0 ? H.indexOf('sec') : H.indexOf('sector');
      const iFrom = col('from');
      const iPkg = col('package');
      const iChg = ['c. on', 'charge on', 'date charge'].map((h) => H.indexOf(h)).find((i) => i >= 0) ?? -1;
      const iAmt = col('amount');
      const iADate = H.indexOf('a. date') >= 0 ? H.indexOf('a. date') : H.indexOf('amount date');
      const iBal = col('bal');

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const id = low(row[iId]);
        const name = norm(row[iName]);
        if (!id || !name) continue;

        const fromKey = low(row[iFrom]).replace(/\s+/g, '');
        const account = ACCOUNT_BY_FROM[fromKey] || ACCOUNT_BY_FROM.gcndigital;
        if (!ACCOUNT_BY_FROM[fromKey] && norm(row[iFrom])) unknownFrom.set(norm(row[iFrom]), (unknownFrom.get(norm(row[iFrom])) || 0) + 1);
        const pkg = normPkg(row[iPkg]);
        let amount = toNum(row[iAmt]);
        const balCell = iBal >= 0 ? norm(row[iBal]) : '';
        const balNum = toNum(balCell);
        // "--" amount + bal filled + often a "Jazz" note → jazz payment of bal.
        // Only then does the Bal represent a paid amount; otherwise Bal is
        // carried arrears from prior months and must NOT be read as a charge.
        const isJazz = norm(row[iAmt]) === '--' || /jazz/i.test(balCell) || /jazz/i.test(norm(row[iBal + 1] ?? ''));
        if (amount == null && balNum != null && isJazz) amount = balNum;

        if (pkg) {
          const p = pkgSeen.get(pkg) || { count: 0, amounts: [] };
          p.count++;
          if (amount) p.amounts.push(amount);
          pkgSeen.set(pkg, p);
        }

        // upsert customer (latest wins)
        const existing = custMap.get(id);
        const cust = existing || {
          id: custMap.size + 1,
          name,
          loginId: id,
          type: 'residential',
          companyName: null,
          houseNo: norm(row[iH]),
          sector: normSector(row[iSec]),
          billingAddress: null,
          currentAccountId: account.id,
          currentPackageId: null,
          currentPackageName: pkg,
          status: 'active',
          phone: '',
          createdAt: `${ym}-01`,
          subscription: { packageId: null, packageName: pkg, frozenAmount: amount ?? null, typicalChargeDay: 5, isActive: true },
          outstandingBalance: 0,
          collectionModel: 'prepaid',
          _lastBal: 0,
          _lastSeen: ym,
        };
        cust.name = name;
        cust.houseNo = norm(row[iH]) || cust.houseNo;
        cust.sector = normSector(row[iSec]);
        cust.currentAccountId = account.id;
        if (pkg) {
          cust.currentPackageName = pkg;
          cust.subscription.packageName = pkg;
        }
        if (amount && !isJazz) cust.subscription.frozenAmount = amount;
        // Bal = carried arrears (from non-Jazz rows only; a Jazz row's Bal is a payment amount).
        if (!isJazz) cust._lastBal = balNum ?? 0;
        cust._lastSeen = ym;
        custMap.set(id, cust);

        const rawChargeIso = clampToMonth(toISO(row[iChg], ym), ym);
        const chargeDate = rawChargeIso || `${ym}-01`;
        // Remember the customer's actual charge day-of-month (latest wins) so the
        // "typical charge day" reflects reality instead of a hardcoded default.
        if (rawChargeIso) {
          const d = Number(rawChargeIso.slice(8, 10));
          if (d >= 1 && d <= 31) cust._lastChargeDay = d;
        }
        const paidDate = clampToMonth(toISO(row[iADate], ym), ym);
        if (amount != null && amount > 0) {
          // One record per (customer, service-month); a later file overwrites an
          // earlier one, collapsing carry-forward duplicates. The payment (if the
          // A. Date is set) rides along on the same record.
          const chargeMonth = chargeDate.slice(0, 7);
          const payMonth = paidDate ? paidDate.slice(0, 7) : null;
          chargeMap.set(`${cust.id}:${chargeMonth}`, {
            customerId: cust.id,
            accountId: account.id,
            packageName: pkg,
            amountCharged: amount,
            costAmount: isConnect(account.id) ? Math.round((amount * 0.48) / 10) * 10 : null,
            chargeDate,
            paidDate: paidDate || null,
            method: isJazz ? 'jazz' : 'cash',
            isArrears: payMonth ? payMonth > chargeMonth : false,
          });
        }
        // The "Bal" column is arrears from PRIOR months; remember whether this
        // (latest-wins) row's own month was paid so we can add the current
        // month's fee to the outstanding balance when it wasn't.
        cust._lastRowAmount = isJazz ? null : amount;
        cust._lastRowPaid = !!paidDate || isJazz;
      }
      continue;
    }

    // ---- Cable (Office Book) sheet — incl. "Office", "B" (2nd book), "F" (fiber connections) ----
    if (['ob', 'o', 'office', 'office book', 'b', 'f'].includes(nmeLower)) {
      const header = (rows[0] || []).map(low);
      // block starts = every column whose header is "date"
      const blockStarts = [];
      header.forEach((h, i) => h === 'date' && blockStarts.push(i));
      for (let b = 0; b < blockStarts.length; b++) {
        const start = blockStarts[b];
        const end = b + 1 < blockStarts.length ? blockStarts[b + 1] : header.length;
        const seg = header.slice(start, end);
        const rel = (name) => {
          const idx = seg.indexOf(name);
          return idx < 0 ? -1 : start + idx;
        };
        const iDate = start;
        const iName = rel('name');
        const iH = rel('h #') >= 0 ? rel('h #') : rel('h#');
        const iSec = rel('sec') >= 0 ? rel('sec') : rel('sector');
        const iAmt = rel('amount');
        if (iAmt < 0 || iH < 0) continue;
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const house = norm(row[iH]);
          const amount = toNum(row[iAmt]);
          if (!house || amount == null || amount <= 0) continue;
          const sector = normSector(row[iSec]);
          const key = `${house}|${sector}`.toLowerCase();
          const name = iName >= 0 ? norm(row[iName]) : '';
          const date = clampToMonth(toISO(row[iDate], ym), ym) || `${ym}-01`;
          const cc =
            cableMap.get(key) || {
              id: cableMap.size + 1,
              name: name || undefined,
              houseNo: house,
              sector,
              monthlyFee: amount,
              balance: 0,
              status: 'active',
              lastPaidDate: date,
            };
          if (name) cc.name = name;
          cc.monthlyFee = amount;
          cc.lastPaidDate = date;
          cableMap.set(key, cc);
          cableEntries.push({
            _key: key,
            id: cableSeq++,
            date,
            kind: 'payment',
            label: `${period} collection`,
            amount,
            note: '',
          });
        }
      }
      continue;
    }

    // ---- Cash book / Expenses (Kharcha) ----
    if (['k', 'kharcha'].includes(nmeLower)) {
      const header = (rows[0] || []).map(low);
      const iDate = header.indexOf('date');
      const iAmt = header.indexOf('amount');
      const iFrom = header.indexOf('from');
      const iDesc = header.indexOf('desc');

      if (iAmt >= 0) {
        // modern layout with proper headers
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const amount = toNum(row[iAmt]);
          if (amount == null || amount === 0) continue;
          const dateCell = norm(row[iDate]);
          const desc = iDesc >= 0 ? norm(row[iDesc]) : '';
          const fromCell = iFrom >= 0 ? low(row[iFrom]) : '';
          const isSalaryRow = /salary|abba|amma|mama|papa/i.test(dateCell);
          const date = clampToMonth(toISO(row[iDate], ym), ym) || `${ym}-01`;
          expenses.push({
            id: expId++, date, amount,
            category: categorize(desc, isSalaryRow),
            description: desc || (isSalaryRow ? dateCell : 'Expense'),
            paidFrom: fromCell.includes('cable') ? 'cable' : 'net',
            person: pickPerson(desc, dateCell),
            periodLabel: period,
          });
        }
      } else {
        // free-form layout: col0 = date, col1 = "<amount> <description>"
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          const cell = norm(row[1]);
          const m = cell.match(/^(\d[\d,]*)\s+(.+)/);
          if (!m) continue;
          const amount = toNum(m[1]);
          if (amount == null || amount <= 0) continue;
          const desc = m[2];
          // skip monthly rollup lines (Net / Recovery / G Total …)
          if (/^(net|recovery|g total|office book|total|kharcha)\b/i.test(desc)) continue;
          const date = clampToMonth(toISO(row[0], ym), ym) || `${ym}-01`;
          expenses.push({
            id: expId++, date, amount,
            category: categorize(desc, /salary|abba|amma|mama|papa/i.test(desc)),
            description: desc.slice(0, 60),
            paidFrom: 'net',
            person: pickPerson(desc, ''),
            periodLabel: period,
          });
        }
      }
      continue;
    }
  }
}

// Flatten the de-duplicated charge map into charge + payment rows.
for (const rec of chargeMap.values()) {
  const cid = chargeId++;
  charges.push({
    id: cid,
    customerId: rec.customerId,
    accountId: rec.accountId,
    packageName: rec.packageName,
    amountCharged: rec.amountCharged,
    costAmount: rec.costAmount,
    chargeDate: rec.chargeDate,
  });
  if (rec.paidDate) {
    payments.push({
      id: paymentId++,
      customerId: rec.customerId,
      chargeId: cid,
      amountReceived: rec.amountCharged,
      receivedDate: rec.paidDate,
      method: rec.method,
      isArrears: rec.isArrears,
    });
  }
}

function categorize(desc, isSalary) {
  const d = desc.toLowerCase();
  if (isSalary || /salary/.test(d)) return 'salary';
  if (/\b(ke|k\.e|gas|bill|electric)\b/.test(d)) return 'utility';
  if (/router|onu|drop|wipe|saman|wire|net ka|cable|equipment/.test(d)) return 'supplies';
  if (/doodh|milk|sabzi|ghost|gosht|fish|biryani|broast|roti|papay|pappy|grocery|kitchen|fees|fruit/.test(d)) return 'household';
  if (/papa|abba|amma|mama|committee/.test(d)) return 'owner_draw';
  if (/\brec\b|recovery/.test(d)) return 'recovery';
  return 'other';
}

function pickPerson(desc, dateCell) {
  const hay = `${desc} ${dateCell}`.toLowerCase();
  for (const p of ['umair', 'nadeem', 'moin', 'irshad', 'abba', 'amma', 'mama', 'papa', 'kabeer', 'hira', 'saleem'])
    if (hay.includes(p)) return p.charAt(0).toUpperCase() + p.slice(1);
  return undefined;
}

// ── Resolve packages ─────────────────────────────────────────────────────
const STANDARD = {
  Yellow: { speedMbps: 12, price: 1300 },
  Orange: { speedMbps: 17, price: 1500 },
  Red: { speedMbps: 22, price: 1800 },
  Brown: { speedMbps: 40, price: 4000 },
  Purple: { speedMbps: 100, price: 5500 },
  Green: { speedMbps: 150, price: 6500 },
};
const packages = [];
let pkgId = 1;
const pkgIdByName = new Map();
const speedFromName = (name) => {
  const m = name.match(/(\d+)\s*mb/i);
  return m ? Number(m[1]) : 0;
};
// standard colours first (keep their canonical speed/price)
for (const [name, meta] of Object.entries(STANDARD)) {
  packages.push({ id: pkgId, name, speedMbps: meta.speedMbps, price: meta.price, isActive: false });
  pkgIdByName.set(name, pkgId++);
}
// every other package label seen in the data (speed-named tiers, Plus, etc.)
for (const [name, info] of [...pkgSeen.entries()].sort((a, b) => b[1].count - a[1].count)) {
  if (pkgIdByName.has(name)) continue;
  const amounts = info.amounts.sort((a, b) => a - b);
  const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0;
  if (info.count < 2 && !/blue|plus|mb/i.test(name)) continue;
  packages.push({ id: pkgId, name, speedMbps: speedFromName(name), price: median, isActive: false });
  pkgIdByName.set(name, pkgId++);
}

// Ensure the canonical portal packages exist as active "N MB" tiers (Connect +
// Fiber offer these speeds). Everything else — legacy colour names, Plus tiers,
// odd sizes — is marked inactive below so it drops out of the pickers.
const PORTAL_SPEEDS = [5, 15, 20, 25, 30, 35, 40, 50, 60, 75, 100];
const PORTAL_PRICE = { 5: 1200, 15: 1300, 20: 1500, 25: 1800, 30: 1800, 35: 2000, 40: 1800, 50: 2500, 60: 3500, 75: 3500, 100: 8000 };
for (const spd of PORTAL_SPEEDS) {
  const name = `${spd} MB`;
  if (!pkgIdByName.has(name)) {
    packages.push({ id: pkgId, name, speedMbps: spd, price: PORTAL_PRICE[spd], isActive: true });
    pkgIdByName.set(name, pkgId++);
  }
}
const CANON_PKG_NAMES = new Set(PORTAL_SPEEDS.map((s) => `${s} MB`));

// map package names → ids on customers & charges
const resolvePkg = (name) => (name ? pkgIdByName.get(name) ?? null : null);
const priceById = new Map(packages.map((p) => [p.id, p.price]));

// Which customers have a payment in their latest-seen month (so the current
// month is settled and we must NOT add its fee again).
const paidInMonth = new Set(payments.map((p) => `${p.customerId}|${p.receivedDate.slice(0, 7)}`));

for (const c of custMap.values()) {
  c.currentPackageId = resolvePkg(c.currentPackageName);
  c.subscription.packageId = resolvePkg(c.subscription.packageName);
  // Churned if not seen in the last ~2 months of history.
  const active = c._lastSeen >= ACTIVE_CUTOFF;
  c.status = active ? 'active' : 'inactive';
  c.subscription.isActive = active;
  c.subscription.typicalChargeDay = c._lastChargeDay ?? 5;

  // Outstanding = carried arrears ("Bal", which lags a month) + the current
  // month's own fee — but ONLY if that latest month wasn't already paid.
  const monthlyFee = c.subscription.frozenAmount ?? priceById.get(c.currentPackageId) ?? 0;
  const currentSettled = c._lastRowPaid || paidInMonth.has(`${c.id}|${c._lastSeen}`);
  const currentDue = currentSettled ? 0 : (c._lastRowAmount ?? monthlyFee ?? 0);
  const outstanding = Math.max(0, (c._lastBal || 0) + (currentDue || 0));
  c.outstandingBalance = active ? outstanding : 0;
  c.monthsOverdue = active && monthlyFee > 0 ? Math.round(c.outstandingBalance / monthlyFee) : 0;

  delete c.currentPackageName;
  delete c.subscription.packageName;
  delete c._lastBal;
  delete c._lastSeen;
  delete c._lastRowAmount;
  delete c._lastRowPaid;
  delete c._lastChargeDay;
}
for (const ch of charges) {
  ch.packageId = resolvePkg(ch.packageName);
  delete ch.packageName;
}

// ── Reconcile ledger to the balance ──────────────────────────────────────
// The imported charges/payments are an incomplete reconstruction (blank-amount
// months, no pre-2021 history). Add one explicit "Opening balance" entry per
// customer so Σcharges − Σpayments EXACTLY equals outstandingBalance — the
// ledger and the balance card can never disagree.
const chargeSum = {};
const paySum = {};
for (const ch of charges) chargeSum[ch.customerId] = (chargeSum[ch.customerId] || 0) + ch.amountCharged;
for (const p of payments) paySum[p.customerId] = (paySum[p.customerId] || 0) + p.amountReceived;

for (const c of custMap.values()) {
  const ledgerNet = (chargeSum[c.id] || 0) - (paySum[c.id] || 0);
  const diff = c.outstandingBalance - ledgerNet;
  if (diff === 0) continue;
  const openingDate = c.createdAt; // first-month day 01 → sorts before real entries
  if (diff > 0) {
    charges.push({
      id: chargeId++, customerId: c.id, accountId: c.currentAccountId, packageId: null,
      amountCharged: diff, costAmount: null, chargeDate: openingDate,
      source: 'opening', label: 'Opening balance (carried arrears)',
    });
  } else {
    payments.push({
      id: paymentId++, customerId: c.id, chargeId: null, amountReceived: -diff,
      receivedDate: openingDate, method: 'other', isArrears: false, label: 'Opening credit',
    });
  }
}

// A package is "active" only if it's one of the canonical portal tiers (the
// speed packages Connect + Fiber actually offer); legacy names stay hidden.
for (const p of packages) p.isActive = CANON_PKG_NAMES.has(p.name);

// ── Finalise cable ───────────────────────────────────────────────────────
const cableCustomers = [...cableMap.values()];
// Cable churn: a subscriber not billed within the last ~2 months of history is
// inactive. Many rows are one-off entries from years ago, so this keeps the
// roster to the current book instead of 5–6 years of accumulated entries.
for (const c of cableCustomers) {
  c.status = (c.lastPaidDate || '') >= ACTIVE_CUTOFF ? 'active' : 'inactive';
}
const keyToCableId = new Map([...cableMap.entries()].map(([k, v]) => [k, v.id]));
const cablePayments = cableEntries.map((e) => ({
  id: e.id,
  cableCustomerId: keyToCableId.get(e._key),
  date: e.date,
  kind: 'payment',
  label: e.label,
  amount: e.amount,
}));

// ── Static reference data ────────────────────────────────────────────────
const providers = [
  { id: 1, name: 'Connect Communication', type: 'reseller' },
  { id: 2, name: 'Fiber ISP', type: 'in_house' },
  { id: 3, name: 'Transworld (legacy)', type: 'reseller' },
];
const accounts = [
  { id: 1, providerId: 1, name: 'GCNDIGITAL', notes: 'Connect franchise account' },
  { id: 2, providerId: 1, name: 'MRGNET', notes: 'Connect franchise account' },
  { id: 3, providerId: 2, name: 'Fiber ISP', notes: 'In-house brand (going forward)' },
  { id: 4, providerId: 3, name: 'Transworld', notes: 'Legacy provider (2020)' },
];

const seed = {
  providers,
  accounts,
  packages,
  customers: [...custMap.values()],
  charges,
  payments,
  cableCustomers,
  cablePayments,
  expenses,
};

writeFileSync(OUT, JSON.stringify(seed, null, 0));

// ── Report ───────────────────────────────────────────────────────────────
console.log('WROTE', OUT);
console.log('internet customers:', seed.customers.length);
console.log('  charges:', charges.length, '| payments:', payments.length);
console.log('  with outstanding>0:', seed.customers.filter((c) => c.outstandingBalance > 0).length);
console.log('packages:', packages.map((p) => `${p.name}${p.isActive ? '' : '*'}`).join(', '), '(*=legacy)');
console.log('cable customers:', cableCustomers.length, '| cable payments:', cablePayments.length);
console.log('expenses:', expenses.length);
const byCat = expenses.reduce((a, e) => ((a[e.category] = (a[e.category] || 0) + 1), a), {});
console.log('  by category:', JSON.stringify(byCat));
const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
console.log('  total expense amount:', totalExp.toLocaleString());
const perAccount = seed.customers.reduce((a, c) => ((a[c.currentAccountId] = (a[c.currentAccountId] || 0) + 1), a), {});
console.log('customers per account (current):', accounts.map((a) => `${a.name}:${perAccount[a.id] || 0}`).join(', '));
if (unknownFrom.size) console.log('UNMAPPED "From" values:', [...unknownFrom.entries()].map(([k, v]) => `${k}(${v})`).join(', '));
