import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Check, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { ChargedTodayRow } from '../services/api';
import type { Package } from '../types';
import { useAuth } from '../services/auth';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate } from '../lib/format';
import { Card, Button, LoadError, cn } from '../components/ui/primitives';

type Tab = 'all' | 'pending' | 'added';

export default function ChargedToday() {
  const { user } = useAuth();
  const canEdit = user?.role !== 'viewer';
  const [reload, setReload] = useState(0);
  const { data, loading, error } = useApi(() => api.chargedToday(), [reload]);
  const { data: packages } = useApi(() => api.packages(), []);
  const [rows, setRows] = useState<ChargedTodayRow[]>([]);
  const [tab, setTab] = useState<Tab>('all');

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const pending = useMemo(() => rows.filter((r) => r.pending), [rows]);
  const added = useMemo(() => rows.filter((r) => !r.pending), [rows]);
  const filtered = tab === 'pending' ? pending : tab === 'added' ? added : rows;
  const addedValue = useMemo(() => added.reduce((s, r) => s + r.amount, 0), [added]);

  // Replace a row in-place after it's committed (pending → added).
  const onCommitted = (id: number, patch: Partial<ChargedTodayRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch, pending: false } : r)));

  if (error) return <LoadError message={error} />;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Clock size={20} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-slate-800">Charged today</h2>
          <p className="text-[13px] text-slate-500">
            Recharges pulled from the Connect &amp; Fiber portals (with the portal's own date &amp; time). Each lands as a{' '}
            <b>draft</b> — check the package/speed, this month's amount and the opening balance, correct anything wrong,
            then <b>Add to record</b>. Nothing touches a customer's balance until you add it.
          </p>
        </div>
        <Button onClick={() => setReload((r) => r + 1)} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Mini label="Recharges today" value={String(rows.length)} />
        <Mini label="To review" value={String(pending.length)} tone={pending.length ? 'text-amber-600' : 'text-slate-800'} />
        <Mini label="Added to record" value={String(added.length)} tone="text-emerald-600" />
        <Mini label="Added value" value={formatPKR(addedValue)} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2.5">
          {(
            [
              ['all', `All (${rows.length})`],
              ['pending', `To review (${pending.length})`],
              ['added', `Added (${added.length})`],
            ] as [Tab, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium', tab === k ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50')}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Package / speed</th>
                <th className="px-4 py-2.5 font-medium">Prev. balance</th>
                <th className="px-4 py-2.5 font-medium">This month</th>
                <th className="px-5 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((r) =>
                r.pending ? (
                  <PendingRow key={r.id} row={r} packages={packages ?? []} onCommitted={onCommitted} canEdit={canEdit} />
                ) : (
                  <AddedRow key={r.id} row={r} />
                )
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-slate-600">
              {tab === 'added' ? 'Nothing added yet today' : tab === 'pending' ? 'Nothing waiting for review' : 'No recharges today'}
            </p>
            <p className="mt-1 text-[13px] text-slate-400">Run the portal sync (Connect Sync → Run sync now) to pull today's recharges.</p>
          </div>
        )}
      </Card>
    </div>
  );
}

function CustomerCell({ row }: { row: ChargedTodayRow }) {
  return (
    <>
      <Link to={`/customers/${row.customerId}`} className="text-[13px] font-medium text-slate-800 hover:text-brand-700">
        {row.name}
      </Link>
      <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
        {row.loginId}
        {row.source === 'connect_sync' && (
          <span className="rounded bg-brand-50 px-1 py-0.5 text-[9px] font-semibold text-brand-700">SYNC</span>
        )}
      </div>
    </>
  );
}

function PendingRow({
  row,
  packages,
  onCommitted,
  canEdit,
}: {
  row: ChargedTodayRow;
  packages: Package[];
  onCommitted: (id: number, patch: Partial<ChargedTodayRow>) => void;
  canEdit: boolean;
}) {
  const [packageId, setPackageId] = useState<number | null>(row.packageId);
  const [amount, setAmount] = useState(String(row.amount ?? 0));
  const [opening, setOpening] = useState(String(row.previousBalance ?? 0));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const total = (Number(opening) || 0) + (Number(amount) || 0);

  const onPackage = (id: number | null) => {
    setPackageId(id);
    const p = packages.find((x) => x.id === id);
    if (p && p.price != null) setAmount(String(p.price)); // default to that package's fee
  };

  const add = async () => {
    setSaving(true);
    setErr('');
    try {
      const res = await api.commitCharge(row.id, Number(opening) || 0, Number(amount) || 0, packageId);
      onCommitted(row.id, {
        amount: res.amount,
        previousBalance: res.previousBalance,
        packageId: res.packageId,
        package: res.package,
        speedMbps: res.speedMbps,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  // Viewers see the staged recharge but can't edit or add it — read-only.
  if (!canEdit) {
    return (
      <tr className="hover:bg-slate-50">
        <td className="whitespace-nowrap px-5 py-3">
          <div className="text-[13px] font-medium text-slate-600">{row.time ?? '—'}</div>
          <div className="text-[11px] text-slate-400">{formatDate(row.chargeDate)}</div>
        </td>
        <td className="px-4 py-3">
          <CustomerCell row={row} />
        </td>
        <td className="px-4 py-3 text-[13px] text-slate-600">{row.houseNo}, {row.sector}</td>
        <td className="px-4 py-3 text-[13px] text-slate-600">{row.account}</td>
        <td className="px-4 py-3 text-[13px] text-slate-600">
          {row.package ?? row.portalSpeed ?? '—'}
          {row.speedMbps && row.package && !/mb/i.test(row.package) ? ` · ${row.speedMbps} MB` : ''}
        </td>
        <td className="px-4 py-3 text-[13px] text-slate-500">{row.previousBalance != null ? formatPKR(row.previousBalance) : '—'}</td>
        <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">{formatPKR(row.amount)}</td>
        <td className="px-5 py-3">
          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Awaiting review</span>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-amber-50/20 align-top hover:bg-amber-50/40">
      <td className="whitespace-nowrap px-5 py-3">
        <div className="text-[13px] font-medium text-slate-600">{row.time ?? '—'}</div>
        <div className="text-[11px] text-slate-400">{formatDate(row.chargeDate)}</div>
      </td>
      <td className="px-4 py-3">
        <CustomerCell row={row} />
      </td>
      <td className="px-4 py-3 text-[13px] text-slate-600">{row.houseNo}, {row.sector}</td>
      <td className="px-4 py-3 text-[13px] text-slate-600">{row.account}</td>
      <td className="px-4 py-3">
        <select
          value={packageId ?? ''}
          onChange={(e) => onPackage(e.target.value ? Number(e.target.value) : null)}
          className="w-40 rounded-md border border-slate-200 px-2 py-1.5 text-[13px] focus:border-brand-400 focus:outline-none"
        >
          <option value="">— select —</option>
          {/* Only the real portal packages (speed tiers) — legacy colour/Plus names are hidden. */}
          {packages
            .filter((p) => p.isActive)
            .slice()
            .sort((a, b) => (a.speedMbps ?? 0) - (b.speedMbps ?? 0))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.speedMbps && !/mb/i.test(p.name) ? ` · ${p.speedMbps} MB` : ''}
              </option>
            ))}
        </select>
        {row.portalSpeed && <div className="mt-1 text-[11px] text-slate-400">portal: {row.portalSpeed}</div>}
      </td>
      <td className="px-4 py-3">
        <MoneyInput value={opening} onChange={setOpening} />
      </td>
      <td className="px-4 py-3">
        <MoneyInput value={amount} onChange={setAmount} />
        <div className="mt-1 text-[11px] text-slate-400">new total {formatPKR(total)}</div>
      </td>
      <td className="px-5 py-3">
        <Button variant="primary" onClick={add} disabled={saving}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Add to record
        </Button>
        {err && <div className="mt-1 text-[11px] font-medium text-red-600">{err}</div>}
      </td>
    </tr>
  );
}

function AddedRow({ row }: { row: ChargedTodayRow }) {
  const total = (row.previousBalance ?? 0) + row.amount;
  return (
    <tr className="hover:bg-slate-50">
      <td className="whitespace-nowrap px-5 py-3">
        <div className="text-[13px] font-medium text-slate-600">{row.time ?? '—'}</div>
        <div className="text-[11px] text-slate-400">{formatDate(row.chargeDate)}</div>
      </td>
      <td className="px-4 py-3">
        <CustomerCell row={row} />
      </td>
      <td className="px-4 py-3 text-[13px] text-slate-600">{row.houseNo}, {row.sector}</td>
      <td className="px-4 py-3 text-[13px] text-slate-600">{row.account}</td>
      <td className="px-4 py-3 text-[13px] text-slate-600">
        {row.package ?? '—'}
        {row.speedMbps && row.package && !/mb/i.test(row.package) ? ` · ${row.speedMbps} MB` : ''}
      </td>
      <td className="px-4 py-3 text-[13px] text-slate-500">{row.previousBalance != null ? formatPKR(row.previousBalance) : '—'}</td>
      <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">{formatPKR(row.amount)}</td>
      <td className="px-5 py-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700">
          <Check size={12} /> Added · bal {formatPKR(total)}
        </span>
      </td>
    </tr>
  );
}

function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center rounded-md border border-slate-200 focus-within:border-brand-400">
      <span className="pl-2 text-[12px] text-slate-400">Rs</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 bg-transparent px-1.5 py-1.5 text-[13px] focus:outline-none"
      />
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[12px] text-slate-400">{label}</div>
      <div className={cn('mt-1 text-xl font-bold', tone ?? 'text-slate-800')}>{value}</div>
    </Card>
  );
}
