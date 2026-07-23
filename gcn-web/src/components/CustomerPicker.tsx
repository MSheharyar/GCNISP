import { useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Customer } from '../types';
import { lookup } from '../services/api';
import { Avatar, PackageTag, cn } from './ui/primitives';
import { initials, formatPKR } from '../lib/format';

// Fast type-ahead customer selector — the entry point of the daily flow.
export default function CustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: Customer[];
  value: Customer | null;
  onChange: (c: Customer | null) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    if (!q) return customers.slice(0, 8);
    const s = q.toLowerCase();
    return customers
      .filter((c) =>
        `${c.name} ${c.loginId} ${c.houseNo ?? ''} ${c.sector ?? ''} ${c.companyName ?? ''}`.toLowerCase().includes(s)
      )
      .slice(0, 8);
  }, [q, customers]);

  if (value) {
    const account = lookup.account(value.currentAccountId);
    const pkg = lookup.package(value.currentPackageId);
    return (
      <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3.5">
        <Avatar label={initials(value.name)} className="h-11 w-11 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-slate-800">{value.name}</div>
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <span>{value.loginId}</span>
            <span>·</span>
            <span>{account?.name}</span>
            <PackageTag name={pkg?.name} muted />
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Balance</div>
          <div className={cn('font-semibold', value.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600')}>
            {value.outstandingBalance > 0 ? formatPKR(value.outstandingBalance) : 'Clear'}
          </div>
        </div>
        <button
          onClick={() => {
            onChange(null);
            setQ('');
            setTimeout(() => ref.current?.focus(), 0);
          }}
          className="ml-1 rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        ref={ref}
        autoFocus
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search by name, login ID, house # or sector…"
        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      {open && results.length > 0 && (
        <div className="scrollbar-thin absolute z-20 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {results.map((c) => {
            const account = lookup.account(c.currentAccountId);
            const pkg = lookup.package(c.currentPackageId);
            return (
              <button
                key={c.id}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-slate-50"
              >
                <Avatar label={initials(c.name)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-slate-800">{c.name}</div>
                  <div className="truncate text-[12px] text-slate-400">
                    {c.loginId} · {c.houseNo}, {c.sector} · {account?.name}
                  </div>
                </div>
                <PackageTag name={pkg?.name} muted />
                {c.outstandingBalance > 0 && (
                  <span className="text-[12px] font-semibold text-red-600">{formatPKR(c.outstandingBalance)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
