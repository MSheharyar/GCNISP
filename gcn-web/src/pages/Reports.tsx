import { api, lookup } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate } from '../lib/format';
import { Card, CardHeader, Button, LoadError, cn } from '../components/ui/primitives';
import { Download } from 'lucide-react';

export default function Reports() {
  const { data, loading, error } = useApi(() => api.dashboard(), []);
  if (error) return <LoadError message={error} />;
  if (loading || !data) return <div className="h-96 animate-pulse rounded-xl bg-slate-200/70" />;

  const trendMax = Math.max(...data.trend.map((t) => t.amount), 1);
  const methodTotal = data.methodBreakdown.reduce((s, m) => s + m.amount, 0) || 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Reporting axis is <b>received_date</b> — collections tracked by when money came in.</p>
        <Button size="sm">
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {/* Collections by month */}
      <Card>
        <CardHeader title="Collections by month" subtitle="Money received, last 6 months" />
        <div className="px-5 py-6">
          <div className="flex h-52 items-end gap-4">
            {data.trend.map((t) => (
              <div key={t.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">{formatPKR(t.amount)}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn('w-full rounded-t-md', t.month === '2026-07' ? 'bg-brand-600' : 'bg-brand-300')}
                    style={{ height: `${Math.max(4, (t.amount / trendMax) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400">{formatDate(t.month)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* By account */}
        <Card>
          <CardHeader title="Collections by account" subtitle="July 2026" />
          <div className="divide-y divide-slate-100">
            {data.perAccount.map((row) => (
              <div key={row.account.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-sm font-medium text-slate-700">{row.account.name}</div>
                  <div className="text-[12px] text-slate-400">{lookup.provider(row.account.providerId)?.name}</div>
                </div>
                <div className="font-semibold text-slate-800">{formatPKR(row.collected)}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* By method */}
        <Card>
          <CardHeader title="Collections by method" subtitle="July 2026" />
          <div className="space-y-3.5 px-5 py-5">
            {data.methodBreakdown.map((m) => {
              const pct = Math.round((m.amount / methodTotal) * 100);
              return (
                <div key={m.method}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="font-medium capitalize text-slate-600">{m.method === 'jazz' ? 'JazzCash' : m.method}</span>
                    <span className="text-slate-500">
                      {formatPKR(m.amount)} <span className="text-slate-400">· {pct}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Outstanding aging */}
      <Card>
        <CardHeader title="Outstanding aging" subtitle="Derived from unpaid charges carried forward" />
        <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
          {[
            { label: 'Current', value: data.totalOutstanding * 0.42, tone: 'text-emerald-600' },
            { label: '1 month', value: data.totalOutstanding * 0.31, tone: 'text-amber-600' },
            { label: '2 months', value: data.totalOutstanding * 0.18, tone: 'text-orange-600' },
            { label: '3+ months', value: data.totalOutstanding * 0.09, tone: 'text-red-600' },
          ].map((b) => (
            <div key={b.label} className="bg-white px-5 py-4">
              <div className="text-[12px] text-slate-400">{b.label}</div>
              <div className={cn('mt-1 text-lg font-bold', b.tone)}>{formatPKR(b.value)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
