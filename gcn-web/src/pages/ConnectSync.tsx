import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Link2,
  Clock,
  TrendingDown,
  Info,
  CircleDollarSign,
} from 'lucide-react';
import { api, lookup } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate } from '../lib/format';
import type { SyncRow, SyncRowStatus } from '../types';
import { Card, PackageTag, Button, cn } from '../components/ui/primitives';

const STATUS_META: Record<SyncRowStatus, { label: string; className: string; icon: typeof Info }> = {
  imported: { label: 'Imported', className: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  duplicate: { label: 'Duplicate — skipped', className: 'bg-slate-100 text-slate-500', icon: Copy },
  unmatched_user: { label: 'Unmatched user', className: 'bg-red-50 text-red-700', icon: Link2 },
  unmapped_speed: { label: 'Unmapped speed', className: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
};

type Tab = 'all' | 'imported' | 'attention' | 'duplicate';

export default function ConnectSync() {
  const [reload, setReload] = useState(0);
  const { data, loading } = useApi(() => api.connectSync(), [reload]);
  const [tab, setTab] = useState<Tab>('all');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');

  const runNow = async () => {
    setRunning(true);
    setRunError('');
    try {
      await api.runSync();
      setReload((r) => r + 1);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setRunning(false);
    }
  };

  const rows = data?.rows ?? [];

  const filtered = useMemo(() => {
    if (tab === 'all') return rows;
    if (tab === 'imported') return rows.filter((r) => r.status === 'imported');
    if (tab === 'duplicate') return rows.filter((r) => r.status === 'duplicate');
    return rows.filter((r) => r.status === 'unmatched_user' || r.status === 'unmapped_speed');
  }, [rows, tab]);

  const totals = useMemo(() => {
    const imported = rows.filter((r) => r.status === 'imported');
    const cost = imported.reduce((s, r) => s + r.costAmount, 0);
    const revenue = imported.reduce((s, r) => s + (r.chargedAmount ?? 0), 0);
    const attention = rows.filter((r) => r.status === 'unmatched_user' || r.status === 'unmapped_speed').length;
    return { count: imported.length, cost, revenue, margin: revenue - cost, attention };
  }, [rows]);

  if (loading || !data) return <div className="h-96 animate-pulse rounded-xl bg-slate-200/70" />;

  return (
    <div className="space-y-5">
      {/* Intro banner */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <RefreshCw size={20} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-slate-800">Portal sync — Connect &amp; Fiber Beam</h2>
          <p className="text-[13px] text-slate-500">
            Every night at 2 AM we log into the Connect and Fiber Beam portals, read the day's recharges for each
            account, and import them as <b>charges</b> — no manual typing. The portal “Amount” is your <b>cost</b>, so
            you get margin automatically. Nothing hits a customer's balance automatically: each recharge lands on{' '}
            <Link to="/charged-today" className="font-medium text-brand-600 hover:underline">Charged Today</Link> as a
            draft for you to review (package, amount, opening balance) and add to the record.
          </p>
          {runError && <p className="mt-1 text-[13px] font-medium text-red-600">{runError}</p>}
        </div>
        <Button variant="primary" onClick={runNow} disabled={running}>
          <RefreshCw size={15} className={running ? 'animate-spin' : ''} />
          {running ? 'Syncing…' : 'Run sync now'}
        </Button>
      </div>

      {/* Per-account run status */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.runs.map((run) => {
          const account = lookup.account(run.accountId);
          return (
            <Card key={run.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-slate-800">{account?.name}</span>
                    <StatusPill status={run.status} />
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-400">
                    <Clock size={12} /> Last run {formatDate(run.startedAt.split(' ')[0])} · {run.startedAt.split(' ')[1]}
                  </div>
                </div>
                <span className="text-[12px] text-slate-400">{run.rowsFetched} rows fetched</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <RunStat label="Imported" value={run.imported} tone="text-emerald-600" />
                <RunStat label="Duplicates" value={run.duplicates} tone="text-slate-500" />
                <RunStat label="Needs attention" value={run.needsAttention} tone={run.needsAttention ? 'text-amber-600' : 'text-slate-400'} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Margin summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <MiniStat label="Recharges imported" value={String(totals.count)} icon={<CheckCircle2 size={16} />} tone="bg-emerald-50 text-emerald-600" />
        <MiniStat label="Revenue (billed)" value={formatPKR(totals.revenue)} icon={<CircleDollarSign size={16} />} tone="bg-brand-50 text-brand-600" />
        <MiniStat label="Connect cost" value={formatPKR(totals.cost)} icon={<TrendingDown size={16} />} tone="bg-red-50 text-red-600" />
        <MiniStat label="Gross margin" value={formatPKR(totals.margin)} icon={<CircleDollarSign size={16} />} tone="bg-violet-50 text-violet-600" />
      </div>

      {/* Attention nudge */}
      {totals.attention > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          <span>
            <b>{totals.attention} rows need attention</b> — portal users with no matching customer, or speeds not yet
            mapped to a package. They were <b>not</b> written to the ledger.
          </span>
          <button onClick={() => setTab('attention')} className="ml-auto shrink-0 font-medium text-amber-700 underline">
            Review
          </button>
        </div>
      )}

      {/* Rows */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-4 py-2.5">
          {(
            [
              ['all', `All (${rows.length})`],
              ['imported', `Imported (${totals.count})`],
              ['attention', `Needs attention (${totals.attention})`],
              ['duplicate', `Duplicates (${rows.filter((r) => r.status === 'duplicate').length})`],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
                tab === key ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Portal user</th>
                <th className="px-4 py-2.5 font-medium">Matched customer</th>
                <th className="px-4 py-2.5 font-medium">Speed → Package</th>
                <th className="px-4 py-2.5 text-right font-medium">Cost</th>
                <th className="px-4 py-2.5 text-right font-medium">Billed</th>
                <th className="px-4 py-2.5 font-medium">Next step</th>
                <th className="px-4 py-2.5 font-medium">Recharged</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((r) => (
                <SyncRowLine key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">Nothing in this tab.</div>
        )}
      </Card>
    </div>
  );
}

function SyncRowLine({ row }: { row: SyncRow }) {
  const meta = STATUS_META[row.status];
  const StatusIcon = meta.icon;
  const custId = row.matchedCustomerId;
  const mapped = undefined as { name?: string } | undefined;
  const attention = row.status === 'unmatched_user' || row.status === 'unmapped_speed';

  return (
    <tr className={cn('hover:bg-slate-50', attention && 'bg-amber-50/30')}>
      <td className="px-5 py-3 font-mono text-[12.5px] text-slate-600">{row.portalUserName}</td>
      <td className="px-4 py-3">
        {custId ? (
          <Link to={`/customers/${custId}`} className="text-[13px] font-medium text-slate-800 hover:text-brand-700">
            {row.matchedName ?? `Customer #${custId}`}
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 text-[13px] text-red-600">
            <Link2 size={13} /> No match
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <span className="font-medium">{row.speedLabel}</span>
          <span className="text-slate-300">→</span>
          {row.status === 'unmapped_speed' ? (
            <span className="text-amber-600">unmapped</span>
          ) : (
            <PackageTag name={mapped?.name} muted />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right text-[13px] text-red-600">{formatPKR(row.costAmount)}</td>
      <td className="px-4 py-3 text-right text-[13px] font-medium text-slate-700">
        {row.chargedAmount != null ? formatPKR(row.chargedAmount) : '—'}
      </td>
      <td className="px-4 py-3">
        {row.status !== 'imported' ? (
          <span className="text-[12px] text-slate-300">—</span>
        ) : (
          <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
            Review &amp; add on Charged Today
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-slate-500">
        {formatDate(row.rechargedAt.split(' ')[0])}
        <span className="ml-1 text-slate-400">{row.rechargedAt.split(' ')[1]?.slice(0, 5)}</span>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-medium', meta.className)}>
            <StatusIcon size={12} /> {meta.label}
          </span>
          {row.status === 'unmatched_user' && (
            <button className="text-[12px] font-medium text-brand-600 hover:underline">Link…</button>
          )}
          {row.status === 'unmapped_speed' && (
            <Link to="/settings" className="text-[12px] font-medium text-brand-600 hover:underline">
              Map…
            </Link>
          )}
        </div>
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: 'success' | 'partial' | 'failed' }) {
  const map = {
    success: 'bg-emerald-50 text-emerald-700',
    partial: 'bg-amber-50 text-amber-700',
    failed: 'bg-red-50 text-red-700',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize', map[status])}>
      {status}
    </span>
  );
}

function RunStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2.5">
      <div className={cn('text-lg font-bold', tone)}>{value}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

function MiniStat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', tone)}>{icon}</span>
      <div className="min-w-0">
        <div className="truncate text-lg font-bold text-slate-800">{value}</div>
        <div className="text-[12px] text-slate-400">{label}</div>
      </div>
    </Card>
  );
}
