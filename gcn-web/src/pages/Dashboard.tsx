import { Link } from 'react-router-dom';
import { TrendingUp, Wallet, AlertTriangle, Users, ArrowUpRight, Clock, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { useApi } from '../lib/useApi';
import { useCountUp } from '../lib/useCountUp';
import { formatPKR, initials } from '../lib/format';
import { Card, CardHeader, OverdueBadge, LoadError, cn } from '../components/ui/primitives';
import PortalStats from '../components/PortalStats';

export default function Dashboard() {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const { data, loading, error } = useApi(() => api.dashboard(), []);
  const { data: today } = useApi(() => api.chargedToday(), []);

  if (error) return <LoadError message={error} />;
  if (loading || !data) return <PageSkeleton />;

  const todayRows = today ?? [];
  const todayTotal = todayRows.reduce((s, r) => s + r.amount, 0);
  const todayPending = todayRows.filter((r) => r.pending).length;

  return (
    <div className="space-y-6">
      {/* KPIs — clickable, animated count-up. Viewers don't see the money totals. */}
      <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2', isViewer ? 'xl:grid-cols-2' : 'xl:grid-cols-4')}>
        {!isViewer && (
          <>
            <Stat i={0} to="/reports" label="Collected this month" value={data.collectedThisMonth} money sub={`${formatPKR(data.collectedToday)} today`} icon={<TrendingUp size={18} />} tone="emerald" />
            <Stat i={1} to="/recovery" label="Total outstanding" value={data.totalOutstanding} money sub="tap to recover" icon={<Wallet size={18} />} tone="red" />
          </>
        )}
        <Stat i={2} to={isViewer ? '/' : '/customers'} label="Active subscribers" value={data.activeSubscribers} sub={`of ${data.subscriberBase.toLocaleString()} on portals`} icon={<Users size={18} />} tone="brand" />
        <Stat i={3} to="/recovery" label="Overdue 2+ months" value={data.overdueCount} sub="carrying arrears" icon={<AlertTriangle size={18} />} tone={data.overdueCount > 0 ? 'red' : 'slate'} />
      </div>

      {/* Live portal snapshot — scraped from Connect & Fiber Beam */}
      <PortalStats />

      {/* Charged today — compact summary linking to the full page */}
      <Link
        to="/charged-today"
        className="animate-rise group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
        style={{ animationDelay: '90ms' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Clock size={19} />
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-800">
              {todayRows.length} recharge{todayRows.length === 1 ? '' : 's'} today · {formatPKR(todayTotal)}
            </div>
            <div className="text-[12.5px] text-slate-400">
              {todayPending > 0 ? `${todayPending} to review & add to record` : 'All added to record'}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 group-hover:gap-2 group-hover:text-brand-700">
          Review <ArrowRight size={15} />
        </span>
      </Link>

      {/* Recovery snapshot — full width */}
      <Card className="animate-rise" style={{ animationDelay: '150ms' }}>
        <CardHeader
          title="Recovery snapshot"
          subtitle="Most recent dues first"
          action={
            <Link to="/recovery" className="inline-flex items-center gap-0.5 text-[13px] font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowUpRight size={14} />
            </Link>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {data.recovery.map((c, i) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              className={cn(
                'flex items-center gap-3 border-b border-slate-100 px-5 py-3.5 transition-colors hover:bg-slate-50',
                i % 2 === 0 && 'sm:border-r'
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-[11px] font-bold text-red-600">
                {initials(c.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium text-slate-800">{c.name}</div>
                <div className="truncate text-[12px] text-slate-400">
                  {c.loginId} · {c.houseNo}, {c.sector}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-red-600">{formatPKR(c.outstandingBalance)}</div>
                <div className="mt-0.5 flex justify-end">
                  <OverdueBadge months={c.monthsOverdue} />
                </div>
              </div>
            </Link>
          ))}
        </div>
        {data.recovery.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">Nothing outstanding — all caught up. 🎉</div>
        )}
      </Card>
    </div>
  );
}

function Stat({
  i,
  to,
  label,
  value,
  money,
  sub,
  icon,
  tone,
}: {
  i: number;
  to: string;
  label: string;
  value: number;
  money?: boolean;
  sub: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'red' | 'brand' | 'slate';
}) {
  const n = useCountUp(value);
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    brand: 'bg-brand-50 text-brand-600',
    slate: 'bg-slate-100 text-slate-500',
  };
  return (
    <Link
      to={to}
      className="animate-rise group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
      style={{ animationDelay: `${i * 70}ms` }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110', tones[tone])}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-800 tabular-nums">{money ? formatPKR(n) : n.toLocaleString()}</div>
      <div className="mt-1 text-[12.5px] text-slate-400">{sub}</div>
    </Link>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-slate-200/70" />
      <div className="h-64 animate-pulse rounded-xl bg-slate-200/70" />
    </div>
  );
}
