import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Tv, ArrowUpDown } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate, initials } from '../lib/format';
import type { CableCustomer } from '../types';
import { Card, Avatar, Button, Pagination, cn } from '../components/ui/primitives';

const PAGE_SIZE = 12;

export default function Cable() {
  const { data: rowsRaw, loading } = useApi(() => api.cableCustomers(), []);
  const [q, setQ] = useState('');
  const [sector, setSector] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  const [sort, setSort] = useState<{ key: 'house' | 'fee' | 'balance'; dir: 'asc' | 'desc' }>({ key: 'house', dir: 'asc' });

  const sectors = useMemo(() => [...new Set((rowsRaw ?? []).map((c) => c.sector))].sort(), [rowsRaw]);

  const rows = useMemo(() => {
    let r = (rowsRaw ?? []).filter((c) => {
      if (statusFilter === 'active' && c.status !== 'active') return false;
      if (sector !== 'all' && c.sector !== sector) return false;
      if (q) {
        const hay = `${c.name ?? ''} ${c.houseNo} ${c.sector}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    r = [...r].sort((a, b) => {
      let x = 0;
      if (sort.key === 'house') x = a.houseNo.localeCompare(b.houseNo, undefined, { numeric: true });
      else if (sort.key === 'fee') x = a.monthlyFee - b.monthlyFee;
      else x = a.balance - b.balance;
      return sort.dir === 'asc' ? x : -x;
    });
    return r;
  }, [rowsRaw, q, sector, sort, statusFilter]);

  const activeCount = useMemo(() => (rowsRaw ?? []).filter((c) => c.status === 'active').length, [rowsRaw]);

  const toggle = (key: 'house' | 'fee' | 'balance') =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' }));

  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [q, sector, sort, statusFilter]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Expected monthly reflects the ACTIVE book only.
  const totalMonthly = (rowsRaw ?? []).filter((c) => c.status === 'active').reduce((s, c) => s + c.monthlyFee, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
          <Tv size={20} />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-slate-800">TV Cable subscribers</h2>
          <p className="text-[13px] text-slate-500">
            The old “Office Book” — cable customers billed by house &amp; sector (no login ID). Separate from Internet.
          </p>
        </div>
        <div className="hidden text-right sm:block">
          <div className="text-[12px] text-slate-400">Expected monthly</div>
          <div className="text-lg font-bold text-slate-800">{formatPKR(totalMonthly)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, house #, sector…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              Sector {s}
            </option>
          ))}
        </select>
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
          {(['active', 'all'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={cn(
                'rounded-md px-3 py-1.5 text-[13px] font-medium capitalize',
                statusFilter === v ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <Button variant="primary">
          <Plus size={16} /> Add cable customer
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 text-[13px] text-slate-500">
          <span className="font-semibold text-slate-700">{rows.length}</span> shown
          <span className="text-slate-400">
            {' '}· {activeCount} active of {(rowsRaw ?? []).length} total
          </span>
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <Th onClick={() => toggle('house')}>House #</Th>
                <th className="px-4 py-2.5 font-medium">Sector</th>
                <Th onClick={() => toggle('fee')}>Monthly fee</Th>
                <th className="px-4 py-2.5 font-medium">Last paid</th>
                <Th onClick={() => toggle('balance')} className="text-right">Balance</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>
                      ))}
                    </tr>
                  ))
                : pageRows.map((c) => <Row key={c.id} c={c} />)}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">No cable customers match.</div>
        )}
        {!loading && rows.length > PAGE_SIZE && (
          <Pagination page={page} pages={pages} total={rows.length} pageSize={PAGE_SIZE} onChange={setPage} />
        )}
      </Card>
    </div>
  );
}

function Row({ c }: { c: CableCustomer }) {
  return (
    <tr className="group hover:bg-slate-50">
      <td className="px-5 py-3">
        <Link to={`/cable/${c.id}`} className="flex items-center gap-3">
          <Avatar label={c.name ? initials(c.name) : c.houseNo.slice(0, 2)} />
          <div className="font-medium text-slate-800 group-hover:text-brand-700">
            {c.name || <span className="text-slate-400">House {c.houseNo}</span>}
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 font-mono text-[13px] text-slate-600">{c.houseNo}</td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{c.sector}</span>
      </td>
      <td className="px-4 py-3 text-[13px] font-medium text-slate-700">{formatPKR(c.monthlyFee)}</td>
      <td className="px-4 py-3 text-[13px] text-slate-500">{c.lastPaidDate ? formatDate(c.lastPaidDate) : '—'}</td>
      <td className="px-4 py-3 text-right">
        <span className={cn('font-semibold', c.balance > 0 ? 'text-red-600' : 'text-slate-400')}>
          {c.balance > 0 ? formatPKR(c.balance) : '—'}
        </span>
      </td>
    </tr>
  );
}

function Th({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <th className={cn('px-4 py-2.5 font-medium', className)}>
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-slate-600">
        {children}
        <ArrowUpDown size={12} className="opacity-50" />
      </button>
    </th>
  );
}
