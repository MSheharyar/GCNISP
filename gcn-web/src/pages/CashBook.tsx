import { useEffect, useMemo, useState } from 'react';
import { Wallet, Plus, TrendingUp, TrendingDown, Coins, Users } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate } from '../lib/format';
import type { Expense, ExpenseCategory } from '../types';
import { useAuth } from '../services/auth';
import { Card, CardHeader, Button, Modal, LoadError, Pagination, cn } from '../components/ui/primitives';

const PAGE_SIZE = 12;
const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const CAT_META: Record<ExpenseCategory, { label: string; className: string }> = {
  salary: { label: 'Salary', className: 'bg-blue-50 text-blue-700' },
  utility: { label: 'Utility', className: 'bg-amber-50 text-amber-700' },
  supplies: { label: 'Supplies', className: 'bg-cyan-50 text-cyan-700' },
  household: { label: 'Household', className: 'bg-pink-50 text-pink-700' },
  owner_draw: { label: 'Owner draw', className: 'bg-violet-50 text-violet-700' },
  recovery: { label: 'Recovery', className: 'bg-emerald-50 text-emerald-700' },
  other: { label: 'Other', className: 'bg-slate-100 text-slate-600' },
};

export default function CashBook() {
  const { user } = useAuth();
  // Expenses (Kharcha) is its own module — only load it when enabled.
  const hasExpenses = user?.isSuperAdmin || !user?.modules || user.modules.includes('expenses');
  const [reload, setReload] = useState(0);
  const { data: summary, error } = useApi(() => api.cashbook(), [reload]);
  const { data: expenses } = useApi(() => (hasExpenses ? api.expenses() : Promise.resolve([])), [reload, hasExpenses]);
  const [cat, setCat] = useState<ExpenseCategory | 'all'>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [monthPage, setMonthPage] = useState(1);
  const [expPage, setExpPage] = useState(1);
  const [expMonth, setExpMonth] = useState<string>('');

  // Months that have expenses, newest first — the Kharcha sheet is browsed per month.
  const expMonths = useMemo(
    () => Array.from(new Set((expenses ?? []).map((e) => e.date.slice(0, 7)))).sort().reverse(),
    [expenses]
  );
  useEffect(() => {
    if (expMonths.length && !expMonths.includes(expMonth)) setExpMonth(expMonths[0]);
  }, [expMonths, expMonth]);
  useEffect(() => setExpPage(1), [cat, expMonth]);

  // The selected month's Kharcha (all categories) + the category-filtered view.
  const monthExpenses = useMemo(
    () => (expenses ?? []).filter((e) => e.date.slice(0, 7) === expMonth),
    [expenses, expMonth]
  );
  const monthTotal = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses]);
  const filtered = useMemo(
    () => [...monthExpenses].filter((e) => cat === 'all' || e.category === cat).sort((a, b) => b.date.localeCompare(a.date)),
    [monthExpenses, cat]
  );

  if (error) return <LoadError message={error} />;
  if (!summary) return <div className="h-96 animate-pulse rounded-xl bg-slate-200/70" />;

  const latest = summary.perMonth.find((m) => m.month === summary.latestMonth) ?? summary.perMonth.at(-1);
  const catEntries = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]) as [ExpenseCategory, number][];
  const personEntries = Object.entries(summary.byPerson).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...catEntries.map(([, v]) => v), 1);

  // Monthly cash flow — latest month on top, paginated.
  const months = [...summary.perMonth].reverse();
  const monthPages = Math.max(1, Math.ceil(months.length / PAGE_SIZE));
  const monthRows = months.slice((monthPage - 1) * PAGE_SIZE, monthPage * PAGE_SIZE);
  const expPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const expRows = filtered.slice((expPage - 1) * PAGE_SIZE, expPage * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Wallet size={20} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-slate-800">Cash Book</h2>
          <p className="text-[13px] text-slate-500">
            Your “Kharcha” ledger — every rupee out (salaries, bills, supplies, household, draws), and profit after it.
          </p>
        </div>
        <Button variant="primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add expense
        </Button>
      </div>

      <AddExpenseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onDone={() => {
          setAddOpen(false);
          setReload((r) => r + 1);
        }}
      />

      {/* Profit for latest month */}
      {latest && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Money label={`Income · ${formatDate(latest.month)}`} value={formatPKR(latest.netIncome + latest.cableIncome)} sub={`Net ${formatPKR(latest.netIncome)} + Cable ${formatPKR(latest.cableIncome)}`} icon={<TrendingUp size={16} />} tone="bg-emerald-50 text-emerald-600" />
          <Money label="Connect cost" value={formatPKR(latest.connectCost)} sub="Wholesale recharge" icon={<TrendingDown size={16} />} tone="bg-red-50 text-red-600" />
          <Money label="Expenses (Kharcha)" value={formatPKR(latest.spend)} sub="Salaries, bills, household…" icon={<Coins size={16} />} tone="bg-amber-50 text-amber-600" />
          <Money label="Paisay bachay (profit)" value={formatPKR(latest.profit)} sub="Income − cost − expenses" icon={<Wallet size={16} />} tone={latest.profit >= 0 ? 'bg-brand-50 text-brand-600' : 'bg-red-50 text-red-600'} highlight />
        </div>
      )}

      {/* Monthly profit table */}
      <Card className="overflow-hidden">
        <CardHeader title="Monthly cash flow" subtitle="Across the months present in your imported records" />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Month</th>
                <th className="px-4 py-2.5 text-right font-medium">Internet</th>
                <th className="px-4 py-2.5 text-right font-medium">Cable</th>
                <th className="px-4 py-2.5 text-right font-medium">Connect cost</th>
                <th className="px-4 py-2.5 text-right font-medium">Expenses</th>
                <th className="px-5 py-2.5 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {monthRows.map((m) => (
                <tr key={m.month} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{formatDate(m.month)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatPKR(m.netIncome)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatPKR(m.cableIncome)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{formatPKR(m.connectCost)}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{formatPKR(m.spend)}</td>
                  <td className={cn('px-5 py-3 text-right font-semibold', m.profit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                    {formatPKR(m.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {months.length > PAGE_SIZE && (
          <Pagination page={monthPage} pages={monthPages} total={months.length} pageSize={PAGE_SIZE} onChange={setMonthPage} />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* By category */}
        <Card>
          <CardHeader title="Expenses by category" subtitle={`Total ${formatPKR(summary.totalSpend)}`} />
          <div className="space-y-3 px-5 py-5">
            {catEntries.map(([c, v]) => (
              <div key={c}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium', CAT_META[c].className)}>{CAT_META[c].label}</span>
                  <span className="text-slate-500">{formatPKR(v)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(v / maxCat) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* By person */}
        <Card>
          <CardHeader title="Cash given / spent by person" action={<Users size={16} className="text-slate-400" />} />
          <div className="divide-y divide-slate-100">
            {personEntries.length === 0 && <div className="px-5 py-8 text-center text-sm text-slate-400">No per-person data.</div>}
            {personEntries.map(([p, v]) => (
              <div key={p} className="flex items-center justify-between px-5 py-3">
                <span className="text-[13px] font-medium text-slate-700">{p}</span>
                <span className="text-[13px] font-semibold text-slate-800">{formatPKR(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly Kharcha sheet */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Monthly Kharcha</h3>
              <p className="text-[12px] text-slate-400">Itemised expenses — one sheet per month, like the Excel</p>
            </div>
            <select
              value={expMonth}
              onChange={(e) => setExpMonth(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 outline-none focus:border-brand-400"
            >
              {expMonths.map((m) => (
                <option key={m} value={m}>
                  {formatDate(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="text-right">
            <div className="text-[12px] text-slate-400">{monthExpenses.length} entries · total</div>
            <div className="text-lg font-bold text-amber-600">{formatPKR(monthTotal)}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2.5">
          <button
            onClick={() => setCat('all')}
            className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium', cat === 'all' ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50')}
          >
            All
          </button>
          {(Object.keys(CAT_META) as ExpenseCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium', cat === c ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50')}
            >
              {CAT_META[c].label}
            </button>
          ))}
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Person</th>
                <th className="px-4 py-2.5 font-medium">From</th>
                <th className="px-5 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {expRows.map((e) => (
                <ExpenseRow key={e.id} e={e} />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-10 text-center text-sm text-slate-400">No expenses for {formatDate(expMonth)}{cat !== 'all' ? ' in this category' : ''}.</div>}
        {filtered.length > PAGE_SIZE && (
          <Pagination page={expPage} pages={expPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setExpPage} />
        )}
      </Card>
    </div>
  );
}

function AddExpenseModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    if (!amount || amount <= 0) {
      setError('Amount is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.createExpense({
        date: String(fd.get('date')),
        amount,
        category: String(fd.get('category')),
        description: String(fd.get('description') ?? '').trim() || 'Expense',
        paidFrom: String(fd.get('paidFrom')),
        person: String(fd.get('person') ?? '').trim() || null,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add expense">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Date</label>
            <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Amount (Rs)</label>
            <input name="amount" inputMode="numeric" className={inputCls} placeholder="0" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Description</label>
          <input name="description" className={inputCls} placeholder="e.g. K-Electric bill, milk, router…" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Category</label>
            <select name="category" className={inputCls} defaultValue="other">
              {(Object.keys(CAT_META) as ExpenseCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CAT_META[c].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Paid from</label>
            <select name="paidFrom" className={inputCls} defaultValue="net">
              <option value="net">Net</option>
              <option value="cable">Cable</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Person</label>
            <input name="person" className={inputCls} placeholder="optional" />
          </div>
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ExpenseRow({ e }: { e: Expense }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-600">{formatDate(e.date)}</td>
      <td className="px-4 py-3 text-[13px] text-slate-700">{e.description}</td>
      <td className="px-4 py-3">
        <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium', CAT_META[e.category].className)}>
          {CAT_META[e.category].label}
        </span>
      </td>
      <td className="px-4 py-3 text-[13px] text-slate-500">{e.person ?? '—'}</td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium capitalize text-slate-600">
          {e.paidFrom}
        </span>
      </td>
      <td className="px-5 py-3 text-right text-[13px] font-semibold text-slate-800">{formatPKR(e.amount)}</td>
    </tr>
  );
}

function Money({
  label,
  value,
  sub,
  icon,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  tone: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn('p-4', highlight && 'ring-2 ring-brand-200')}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-slate-500">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tone)}>{icon}</span>
      </div>
      <div className="mt-2 text-xl font-bold text-slate-800">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>
    </Card>
  );
}
