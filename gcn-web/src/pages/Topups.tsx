import { useState } from 'react';
import { Wallet, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR } from '../lib/format';
import { Card, Button, LoadError, cn } from '../components/ui/primitives';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortMonth = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${MONTHS_SHORT[Number(m) - 1]} '${y.slice(2)}`;
};

export default function Topups() {
  const [reload, setReload] = useState(0);
  const { data, loading, error } = useApi(() => api.topups(), [reload]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshErr, setRefreshErr] = useState('');

  const refresh = async () => {
    setRefreshing(true);
    setRefreshErr('');
    try {
      await api.refreshTopups();
      setReload((r) => r + 1);
    } catch (e) {
      setRefreshErr(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  if (error) return <LoadError message={error} />;

  const months = data?.months ?? [];
  const accounts = data?.accounts ?? [];
  const grandTotal = accounts.reduce((s, a) => s + a.total, 0);
  const thisMonth = months.length ? (data?.totalsByMonth[months[months.length - 1]] ?? 0) : 0;
  const avg = months.length ? Math.round(grandTotal / months.length) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Wallet size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Top-up received</h2>
            <p className="text-[13px] text-slate-500">
              Monthly credit the companies added to your wallets — Connect (GCNDIGITAL, MRGNET) &amp; Fiber Beam — to spend on packages.
            </p>
            {data?.capturedAt && <p className="mt-0.5 text-[12px] text-slate-400">As of {data.capturedAt.replace('T', ' ').slice(0, 16)}</p>}
          </div>
        </div>
        <Button variant="secondary" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
      {refreshErr && <div className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{refreshErr}</div>}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Mini label={`This month (${months.length ? shortMonth(months[months.length - 1]) : ''})`} value={formatPKR(thisMonth)} tone="text-emerald-600" />
        <Mini label={`Last ${months.length} months`} value={formatPKR(grandTotal)} />
        <Mini label="Average / month" value={formatPKR(avg)} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading && !data ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No top-up data yet. Click <b>Refresh</b> to pull it from the portals.
          </div>
        ) : (
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-medium">Portal / account</th>
                  {months.map((m) => (
                    <th key={m} className="px-4 py-2.5 text-right font-medium">{shortMonth(m)}</th>
                  ))}
                  <th className="px-5 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {accounts.map((a) => (
                  <tr key={a.accountId} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{a.account}</td>
                    {months.map((m) => (
                      <td key={m} className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {a.byMonth[m] ? formatPKR(a.byMonth[m]) : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-800">{formatPKR(a.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/60 text-[13px] font-semibold text-slate-800">
                  <td className="px-5 py-3">Total</td>
                  {months.map((m) => (
                    <td key={m} className="px-4 py-3 text-right tabular-nums">{formatPKR(data?.totalsByMonth[m] ?? 0)}</td>
                  ))}
                  <td className={cn('px-5 py-3 text-right tabular-nums text-emerald-700')}>{formatPKR(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[12px] text-slate-400">{label}</div>
      <div className={cn('mt-1 text-xl font-bold tabular-nums', tone ?? 'text-slate-800')}>{value}</div>
    </Card>
  );
}
