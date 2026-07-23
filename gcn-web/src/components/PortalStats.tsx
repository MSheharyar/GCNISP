import { useEffect, useState } from 'react';
import { RefreshCw, Wallet, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import type { PortalStat } from '../services/api';
import { useApi } from '../lib/useApi';
import { useAuth } from '../services/auth';
import { formatPKR } from '../lib/format';
import { Card, CardHeader, cn } from './ui/primitives';

export default function PortalStats() {
  const { user } = useAuth();
  const canRefresh = user?.role !== 'viewer';
  const [reload] = useState(0);
  const { data, loading } = useApi(() => api.portalStats(), [reload]);
  const [rows, setRows] = useState<PortalStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      setRows(await api.refreshPortalStats());
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && rows.length === 0) return <div className="h-48 animate-pulse rounded-xl bg-slate-200/70" />;
  if (rows.length === 0) return null;

  const capturedAt = rows.find((r) => r.capturedAt)?.capturedAt;

  return (
    <Card className="animate-rise" style={{ animationDelay: '60ms' }}>
      <CardHeader
        title="Live portal snapshot"
        subtitle={
          capturedAt
            ? `Scraped from Connect & Fiber Beam · as of ${capturedAt.slice(11, 16)}`
            : 'Scraped from Connect & Fiber Beam'
        }
        action={
          canRefresh ? (
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          ) : undefined
        }
      />
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
        {rows.map((r) => (
          <AccountCard key={r.accountId} s={r} />
        ))}
      </div>
    </Card>
  );
}

// Deep-link each tile to the matching list on the upstream portal (opens there).
const CONNECT = 'https://www.connect.net.pk';
const FIBER = 'https://billing.fiber-beam.net/en';
function tileUrl(source: string, metric: string): string | null {
  if (source === 'fiberbeam') {
    const map: Record<string, string> = {
      total: `${FIBER}/userlist.php`,
      active: `${FIBER}/userlist.php`,
      online: `${FIBER}/userlist.php`,
      offline: `${FIBER}/offline.php`,
      expired: `${FIBER}/expire.php`,
      new: `${FIBER}/new_user.php`,
    };
    return map[metric] ?? null;
  }
  const map: Record<string, string> = {
    total: `${CONNECT}/customers`,
    active: `${CONNECT}/customers`,
    online: `${CONNECT}/customers/report/online`,
    offline: `${CONNECT}/customers/report/offline`,
    expired: `${CONNECT}/customers`,
  };
  return map[metric] ?? null;
}

function AccountCard({ s }: { s: PortalStat }) {
  const isFiber = s.source === 'fiberbeam';
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-800">{s.account}</div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {isFiber ? 'Fiber Beam' : 'Connect'}
          </span>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1 text-sm font-bold text-slate-800">
            <Wallet size={14} className="text-brand-500" /> {s.balance != null ? formatPKR(s.balance) : '—'}
          </div>
          <div className="text-[11px] text-slate-400">wallet</div>
        </div>
      </div>

      {s.error ? (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600">Scrape failed: {s.error}</div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Tile label="Total" value={s.total} href={tileUrl(s.source, 'total')} />
          <Tile label="Active" value={s.active} tone="text-brand-600" href={tileUrl(s.source, 'active')} />
          <Tile label="Online" value={s.online} tone="text-emerald-600" dot="bg-emerald-500" href={tileUrl(s.source, 'online')} />
          <Tile label="Offline" value={s.offline} tone="text-slate-500" dot="bg-slate-400" href={tileUrl(s.source, 'offline')} />
          <Tile label="Expired" value={s.expired} tone="text-red-600" href={tileUrl(s.source, 'expired')} />
          {isFiber ? (
            <Tile label="New" value={s.newUsers} tone="text-violet-600" href={tileUrl(s.source, 'new')} />
          ) : (
            <Tile label="Expiring 3d" value={s.expiring} tone="text-amber-600" href={null} />
          )}
        </div>
      )}

      {isFiber && s.topupReceived != null && (
        <div className="mt-2.5 flex justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
          <span className="text-slate-500">Top-up received (month)</span>
          <span className="font-semibold text-emerald-600">{formatPKR(s.topupReceived)}</span>
        </div>
      )}

      {s.packages && s.packages.length > 0 && <PackageWise packages={s.packages} />}
    </div>
  );
}

function PackageWise({ packages }: { packages: NonNullable<PortalStat['packages']> }) {
  const [open, setOpen] = useState(false);
  const rows = packages.filter((p) => p.online > 0 || p.active > 0);
  const totalOnline = packages.reduce((s, p) => s + p.online, 0);
  const totalActive = packages.reduce((s, p) => s + p.active, 0);
  return (
    <div className="mt-2.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-600 hover:bg-slate-100"
      >
        <span>Package-wise online</span>
        <span className="flex items-center gap-1 text-slate-400">
          {totalOnline} online / {totalActive} active
          <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && (
        <div className="mt-1.5 overflow-hidden rounded-lg border border-slate-100">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50 text-[10.5px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-1.5 text-left font-medium">Speed</th>
                <th className="px-3 py-1.5 text-right font-medium">Online</th>
                <th className="px-3 py-1.5 text-right font-medium">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((p) => (
                <tr key={p.speed}>
                  <td className="px-3 py-1.5 font-medium text-slate-600">{p.speed}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600">{p.online}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-700">{p.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
  dot,
  href,
}: {
  label: string;
  value: number | null;
  tone?: string;
  dot?: string;
  href?: string | null;
}) {
  const inner = (
    <>
      <div className={cn('text-lg font-bold tabular-nums', tone ?? 'text-slate-800')}>{value ?? '—'}</div>
      <div className="flex items-center justify-center gap-1 text-[10.5px] font-medium uppercase tracking-wide text-slate-400">
        {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
        {label}
      </div>
    </>
  );
  const base = 'rounded-lg bg-slate-50 px-2.5 py-2 text-center';
  if (!href) return <div className={base}>{inner}</div>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`Open ${label} list on the portal`}
      className={cn(base, 'block transition-colors hover:bg-brand-50 hover:ring-1 hover:ring-brand-200')}
    >
      {inner}
    </a>
  );
}
