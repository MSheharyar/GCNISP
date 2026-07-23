import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Search, Check } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate } from '../lib/format';
import { Card, Pagination, PackageTag, LoadError, cn } from '../components/ui/primitives';

const METHOD_LABEL: Record<string, string> = { cash: 'Cash', jazz: 'JazzCash', bank: 'Bank', other: 'Other' };
const PAGE_SIZE = 15;

export default function MonthlyRegister() {
  const [month, setMonth] = useState<string | undefined>(undefined);
  const { data, loading, error } = useApi(() => api.monthly(month), [month]);
  const [q, setQ] = useState('');
  const [account, setAccount] = useState('all');
  const [page, setPage] = useState(1);

  const accounts = useMemo(() => Array.from(new Set((data?.rows ?? []).map((r) => r.account))), [data]);

  // Account filter drives the summary; search only narrows the visible list.
  const accountRows = useMemo(
    () => (account === 'all' ? data?.rows ?? [] : (data?.rows ?? []).filter((r) => r.account === account)),
    [data, account]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return accountRows;
    return accountRows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.loginId.toLowerCase().includes(s) ||
        (r.houseNo ?? '').toLowerCase().includes(s) ||
        (r.sector ?? '').toLowerCase().includes(s)
    );
  }, [accountRows, q]);

  const s = useMemo(
    () => ({
      count: accountRows.length,
      charged: accountRows.reduce((t, r) => t + r.amount, 0),
      collected: accountRows.filter((r) => r.paid).reduce((t, r) => t + r.amount, 0),
      paidCount: accountRows.filter((r) => r.paid).length,
    }),
    [accountRows]
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (error) return <LoadError message={error} />;

  return (
    <div className="space-y-5">
      {/* Header + month picker */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <CalendarDays size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Monthly register</h2>
            <p className="text-[13px] text-slate-500">
              Every user billed in a month — package/speed, charge date, amount, payment and running balance.
            </p>
          </div>
        </div>
        <select
          value={data?.month ?? ''}
          onChange={(e) => {
            setMonth(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-700 focus:border-brand-400 focus:outline-none"
        >
          {(data?.months ?? []).map((m) => (
            <option key={m} value={m}>
              {formatDate(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Mini label="Users billed" value={String(s.count)} />
        <Mini label="Charged" value={formatPKR(s.charged)} />
        <Mini label="Collected" value={formatPKR(s.collected)} tone="text-emerald-600" />
        <Mini label="Paid" value={`${s.paidCount} / ${s.count}`} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1">
            {['all', ...accounts].map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAccount(a);
                  setPage(1);
                }}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium',
                  account === a ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                {a === 'all' ? 'All accounts' : a}
              </button>
            ))}
          </div>
          <div className="ml-auto flex min-w-[220px] flex-1 items-center gap-2">
            <Search size={15} className="text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, login ID, house or sector…"
              className="w-full bg-transparent text-[13px] focus:outline-none"
            />
          </div>
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Package / speed</th>
                <th className="px-4 py-2.5 font-medium">Charged</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Payment</th>
                <th className="px-5 py-2.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pageRows.map((r) => (
                <tr key={r.chargeId} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Link to={`/customers/${r.customerId}`} className="text-[13px] font-medium text-slate-800 hover:text-brand-700">
                      {r.name}
                    </Link>
                    <div className="text-[12px] text-slate-400">{r.loginId}</div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">{r.houseNo}, {r.sector}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">{r.account}</td>
                  <td className="px-4 py-3">
                    {r.package ? (
                      <span className="text-[13px] text-slate-600">
                        {r.package}
                        {r.speedMbps && !/mb/i.test(r.package) ? ` · ${r.speedMbps} MB` : ''}
                      </span>
                    ) : (
                      <PackageTag name={null} />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{formatDate(r.chargeDate)}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold text-slate-800 tabular-nums">{formatPKR(r.amount)}</td>
                  <td className="px-4 py-3">
                    {r.paid ? (
                      <span className="inline-flex items-center gap-1 text-[12.5px] text-emerald-700">
                        <Check size={13} /> {formatDate(r.paidDate)}
                        <span className="text-slate-400">· {METHOD_LABEL[r.method ?? ''] ?? r.method}</span>
                      </span>
                    ) : (
                      <span className="inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Unpaid</span>
                    )}
                  </td>
                  <td className={cn('px-5 py-3 text-right text-[13px] font-semibold tabular-nums', r.balance > 0 ? 'text-red-600' : 'text-slate-400')}>
                    {formatPKR(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No records for this month.</div>
        ) : (
          <Pagination page={page} pages={pages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
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
