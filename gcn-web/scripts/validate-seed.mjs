import { readFileSync } from 'node:fs';
const s = JSON.parse(readFileSync('src/data/seed.json', 'utf8'));
let problems = 0;
const bad = (cond, msg) => { if (cond) { console.log('  ✗', msg); problems++; } };
const ok = (msg) => console.log('  ✓', msg);

const custIds = new Set(s.customers.map((c) => c.id));
const chargeIds = new Set(s.charges.map((c) => c.id));
const acctIds = new Set(s.accounts.map((a) => a.id));
const pkgIds = new Set(s.packages.map((p) => p.id));
const cableIds = new Set(s.cableCustomers.map((c) => c.id));

console.log('COUNTS');
console.log(`  customers ${s.customers.length} | charges ${s.charges.length} | payments ${s.payments.length}`);
console.log(`  cable ${s.cableCustomers.length} | cablePayments ${s.cablePayments.length} | expenses ${s.expenses.length}`);
console.log(`  accounts ${s.accounts.length} | packages ${s.packages.length}`);

console.log('\nREFERENTIAL INTEGRITY');
bad(s.charges.some((c) => !custIds.has(c.customerId)), 'charge → missing customer');
bad(s.charges.some((c) => !acctIds.has(c.accountId)), 'charge → missing account');
bad(s.charges.some((c) => c.packageId != null && !pkgIds.has(c.packageId)), 'charge → missing package');
bad(s.payments.some((p) => !custIds.has(p.customerId)), 'payment → missing customer');
bad(s.payments.some((p) => p.chargeId != null && !chargeIds.has(p.chargeId)), 'payment → missing charge');
bad(s.cablePayments.some((p) => !cableIds.has(p.cableCustomerId)), 'cablePayment → missing cable customer');
bad(s.customers.some((c) => !acctIds.has(c.currentAccountId)), 'customer → missing account');
bad(s.customers.some((c) => c.currentPackageId != null && !pkgIds.has(c.currentPackageId)), 'customer → missing package');
if (!problems) ok('all foreign keys resolve');

console.log('\nVALUE SANITY');
const numOk = (v) => typeof v === 'number' && Number.isFinite(v);
bad(s.charges.some((c) => !numOk(c.amountCharged) || c.amountCharged <= 0), 'charge amount NaN/≤0');
bad(s.payments.some((p) => !numOk(p.amountReceived) || p.amountReceived <= 0), 'payment amount NaN/≤0');
bad(s.customers.some((c) => !numOk(c.outstandingBalance) || c.outstandingBalance < 0), 'customer balance NaN/<0');
bad(s.expenses.some((e) => !numOk(e.amount) || e.amount <= 0), 'expense amount NaN/≤0');
bad(s.cableCustomers.some((c) => !numOk(c.monthlyFee)), 'cable fee NaN');

console.log('\nDATE SANITY');
const dOk = (d) => typeof d === 'string' && /^\d{4}-\d{2}(-\d{2})?$/.test(d);
const MINY = '2019-01', MAXY = '2026-08';
bad(s.charges.some((c) => !dOk(c.chargeDate)), 'charge date malformed');
bad(s.payments.some((p) => !dOk(p.receivedDate)), 'payment date malformed');
const chOut = s.charges.filter((c) => c.chargeDate < MINY || c.chargeDate > MAXY).length;
const pyOut = s.payments.filter((p) => p.receivedDate < MINY || p.receivedDate > MAXY).length;
bad(chOut > 0, `${chOut} charges dated outside ${MINY}..${MAXY}`);
bad(pyOut > 0, `${pyOut} payments dated outside ${MINY}..${MAXY}`);
const dayDefault = s.charges.filter((c) => c.chargeDate.endsWith('-01')).length;
console.log(`  charges defaulting to day-01: ${dayDefault} (${((dayDefault / s.charges.length) * 100).toFixed(1)}%)`);

console.log('\nDUPLICATES');
const dupCust = s.customers.length - new Set(s.customers.map((c) => c.loginId.toLowerCase())).size;
bad(new Set(s.customers.map((c) => c.id)).size !== s.customers.length, 'duplicate customer ids');
bad(new Set(s.charges.map((c) => c.id)).size !== s.charges.length, 'duplicate charge ids');
console.log(`  customers sharing a loginId: ${dupCust}`);

console.log('\nDISTRIBUTIONS');
const active = s.customers.filter((c) => c.status === 'active');
console.log('  active internet:', active.length, '| inactive:', s.customers.length - active.length);
console.log('  by account (active):', s.accounts.map((a) => `${a.name}:${active.filter((c) => c.currentAccountId === a.id).length}`).join(', '));
console.log('  cable w/ balance>0:', s.cableCustomers.filter((c) => c.balance > 0).length);
const fcPays = s.cablePayments.filter((p) => p.note === 'FC').length;
console.log('  cable payments from FC sheets:', fcPays);
const expMonths = new Set(s.expenses.map((e) => e.date.slice(0, 7)));
console.log('  expense months covered:', expMonths.size);

console.log(problems ? `\n❌ ${problems} problem(s)` : '\n✅ ALL CHECKS PASSED');
