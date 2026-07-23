import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, Plus, ArrowUpDown, Building2, AlertTriangle } from 'lucide-react';
import { api, lookup } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR } from '../lib/format';
import type { Customer, CustomerStatus } from '../types';
import {
  Card,
  PackageTag,
  StatusBadge,
  AccountChip,
  Avatar,
  OverdueBadge,
  Pagination,
  cn,
} from '../components/ui/primitives';
import { initials } from '../lib/format';

type SortKey = 'name' | 'balance' | 'sector' | 'status';
const PAGE_SIZE = 12;

export default function Customers() {
  const { data: customers, loading } = useApi(() => api.customers(), []);
  const { data: accounts } = useApi(() => api.accounts(), []);
  const [params] = useSearchParams();

  const [q, setQ] = useState('');
  // Default to the current roster (active). The full 5–6 years of history stays
  // in the system (it powers the Monthly Register, ledgers and reports) — it's
  // just not shown here until you switch the status filter to Inactive / All.
  const [status, setStatus] = useState<CustomerStatus | 'all'>('active');
  const [accountId, setAccountId] = useState<number | 'all'>('all');
  const [type, setType] = useState<'all' | 'residential' | 'commercial'>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'name', dir: 'asc' });
  const [overdueOnly, setOverdueOnly] = useState(false);

  const onlyUnset = params.get('filter') === 'unset';

  const filtered = useMemo(() => {
    if (!customers) return [];
    let rows = customers.filter((c) => {
      if (onlyUnset && c.currentPackageId !== null) return false;
      if (overdueOnly && c.monthsOverdue < 2) return false;
      if (status !== 'all' && c.status !== status) return false;
      if (accountId !== 'all' && c.currentAccountId !== accountId) return false;
      if (type !== 'all' && c.type !== type) return false;
      if (q) {
        const hay = `${c.name} ${c.loginId} ${c.sector} ${c.companyName ?? ''} ${c.houseNo ?? ''}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    rows = [...rows].sort((a, b) => {
      let r = 0;
      if (sort.key === 'name') r = a.name.localeCompare(b.name);
      else if (sort.key === 'balance') r = a.outstandingBalance - b.outstandingBalance;
      else if (sort.key === 'sector') r = (a.sector ?? '').localeCompare(b.sector ?? '');
      else if (sort.key === 'status') r = a.status.localeCompare(b.status);
      return sort.dir === 'asc' ? r : -r;
    });
    return rows;
  }, [customers, q, status, accountId, type, sort, onlyUnset, overdueOnly]);

  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q, status, accountId, type, sort, overdueOnly, onlyUnset]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, login ID, sector, company…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <Select value={status} onChange={(v) => setStatus(v as CustomerStatus | 'all')}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </Select>

        <Select value={accountId} onChange={(v) => setAccountId(v === 'all' ? 'all' : Number(v))}>
          <option value="all">All accounts</option>
          {accounts?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>

        <Select value={type} onChange={(v) => setType(v as typeof type)}>
          <option value="all">All types</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
        </Select>

        <button
          onClick={() => setOverdueOnly((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition',
            overdueOnly ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <AlertTriangle size={15} /> Overdue 2+
        </button>

        <Link
          to="/customers/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          <Plus size={16} /> Add Customer
        </Link>
      </div>

      {onlyUnset && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
          <SlidersHorizontal size={14} /> Showing only customers with an unset package (backfill list).
          <Link to="/customers" className="ml-auto font-medium text-amber-700 underline">
            Clear
          </Link>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-[13px] text-slate-500">
            <span className="font-semibold text-slate-700">{filtered.length}</span> shown
            {customers && customers.length !== filtered.length && (
              <span className="text-slate-400"> · {customers.length.toLocaleString()} total in system</span>
            )}
          </p>
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <Th onClick={() => toggleSort('name')}>Customer</Th>
                <Th onClick={() => toggleSort('sector')}>Location</Th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Package</th>
                <Th onClick={() => toggleSort('status')}>Status</Th>
                <Th onClick={() => toggleSort('balance')} className="text-right">
                  Balance
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : pageRows.map((c) => <Row key={c.id} c={c} />)}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-14 text-center text-sm text-slate-400">No customers match these filters.</div>
        )}
        {!loading && filtered.length > PAGE_SIZE && (
          <Pagination page={page} pages={pages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}

function Row({ c }: { c: Customer }) {
  const account = lookup.account(c.currentAccountId);
  const provider = lookup.accountProvider(c.currentAccountId);
  const pkg = lookup.package(c.currentPackageId);
  return (
    <tr className="group hover:bg-slate-50">
      <td className="px-4 py-3">
        <Link to={`/customers/${c.id}`} className="flex items-center gap-3">
          <Avatar label={initials(c.name)} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate font-medium text-slate-800 group-hover:text-brand-700">
              {c.type === 'commercial' && <Building2 size={13} className="shrink-0 text-slate-400" />}
              {c.name}
            </div>
            <div className="truncate text-[12px] text-slate-400">{c.loginId}</div>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 text-[13px] text-slate-600">
        <div>{c.sector}</div>
        <div className="text-[12px] text-slate-400">{c.houseNo}</div>
      </td>
      <td className="px-4 py-3">
        <AccountChip name={account?.name ?? '—'} inHouse={provider?.type === 'in_house'} />
      </td>
      <td className="px-4 py-3">
        <PackageTag name={pkg?.name} />
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={c.status} />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <OverdueBadge months={c.monthsOverdue} />
          <span className={cn('font-semibold', c.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-400')}>
            {c.outstandingBalance > 0 ? formatPKR(c.outstandingBalance) : '—'}
          </span>
        </div>
      </td>
    </tr>
  );
}

function Th({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th className={cn('px-4 py-2.5 font-medium', className)}>
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-600">
        {children}
        <ArrowUpDown size={12} className="opacity-50" />
      </button>
    </th>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
    >
      {children}
    </select>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 animate-pulse rounded bg-slate-100" />
        </td>
      ))}
    </tr>
  );
}
