import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins, Zap, Download } from 'lucide-react';
import { api, lookup } from '../services/api';
import { useAuth } from '../services/auth';
import { useApi } from '../lib/useApi';
import { formatPKR, initials } from '../lib/format';
import { Card, PackageTag, StatusBadge, AccountChip, Avatar, Button, OverdueBadge, Pagination, cn } from '../components/ui/primitives';

const PAGE_SIZE = 12;

export default function Recovery() {
  const { user } = useAuth();
  const canEdit = user?.role !== 'viewer';
  const { data: customers, loading } = useApi(() => api.recovery(), []);
  const [sort, setSort] = useState<'amount' | 'name'>('amount');
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    if (!customers) return [];
    return [...customers].sort((a, b) =>
      sort === 'amount' ? b.outstandingBalance - a.outstandingBalance : a.name.localeCompare(b.name)
    );
  }, [customers, sort]);

  const total = rows.reduce((s, c) => s + c.outstandingBalance, 0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <HandCoins size={18} />
            </span>
            <div>
              <div className="text-[13px] text-slate-500">Total to recover</div>
              <div className="text-xl font-bold text-slate-800">{formatPKR(total)}</div>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] text-slate-500">Customers with dues</div>
          <div className="mt-1 text-xl font-bold text-slate-800">{rows.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-[13px] text-slate-500">Overdue 2+ months</div>
          <div className="mt-1 text-xl font-bold text-red-600">{rows.filter((c) => c.monthsOverdue >= 2).length}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-slate-600">Sort by</span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
              {(['amount', 'name'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSort(s);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[12.5px] font-medium capitalize',
                    sort === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <Button size="sm">
            <Download size={14} /> Export
          </Button>
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Package</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Outstanding</th>
                {canEdit && <th className="px-5 py-2.5 text-right font-medium">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-4 animate-pulse rounded bg-slate-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : pageRows.map((c) => {
                    const provider = lookup.accountProvider(c.currentAccountId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <Link to={`/customers/${c.id}`} className="flex items-center gap-3">
                            <Avatar label={initials(c.name)} />
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-medium text-slate-800">{c.name}</div>
                              <div className="truncate text-[12px] text-slate-400">
                                {c.loginId} · {c.houseNo}, {c.sector}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <AccountChip name={lookup.account(c.currentAccountId)?.name ?? '—'} inHouse={provider?.type === 'in_house'} />
                        </td>
                        <td className="px-4 py-3">
                          <PackageTag name={lookup.package(c.currentPackageId)?.name} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <OverdueBadge months={c.monthsOverdue} />
                            <span className="font-semibold text-red-600">{formatPKR(c.outstandingBalance)}</span>
                          </div>
                        </td>
                        {canEdit && (
                          <td className="px-5 py-3 text-right">
                            <Link to={`/log?customer=${c.id}&collect=1`}>
                              <Button size="sm" variant="primary">
                                <Zap size={13} /> Collect
                              </Button>
                            </Link>
                          </td>
                        )}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
        {!loading && rows.length > PAGE_SIZE && (
          <Pagination page={page} pages={pages} total={rows.length} pageSize={PAGE_SIZE} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}
