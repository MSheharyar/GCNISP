import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { PackageColor, CustomerStatus, PaymentMethod } from '../../types';

// ── cn helper ───────────────────────────────────────────────────────────
export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// ── Card ────────────────────────────────────────────────────────────────
export function Card({ className, children, style }: { className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Button ──────────────────────────────────────────────────────────────
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = 'secondary', size = 'md', className, children, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-2.5 py-1.5 text-[13px]', md: 'px-3.5 py-2 text-sm' };
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} {...rest}>
      {children}
    </button>
  );
}

// ── Package tag (color IS the identity) ─────────────────────────────────
const PKG_STYLE: Record<PackageColor, { dot: string; bg: string; text: string }> = {
  Yellow: { dot: 'bg-[var(--color-pkg-yellow)]', bg: 'bg-amber-50', text: 'text-amber-700' },
  Orange: { dot: 'bg-[var(--color-pkg-orange)]', bg: 'bg-orange-50', text: 'text-orange-700' },
  Red: { dot: 'bg-[var(--color-pkg-red)]', bg: 'bg-red-50', text: 'text-red-700' },
  Brown: { dot: 'bg-[var(--color-pkg-brown)]', bg: 'bg-[#f4ece4]', text: 'text-[#7a4a1e]' },
  Purple: { dot: 'bg-[var(--color-pkg-purple)]', bg: 'bg-violet-50', text: 'text-violet-700' },
  Green: { dot: 'bg-[var(--color-pkg-green)]', bg: 'bg-emerald-50', text: 'text-emerald-700' },
};

// Legacy/unknown packages (Blue, 2Plus, 3MB…) from imported history fall back
// to a neutral style so they render instead of crashing.
const PKG_FALLBACK = { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-600' };

export function PackageTag({ name, muted }: { name?: PackageColor | string | null; muted?: boolean }) {
  if (!name) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-400">
        Unset
      </span>
    );
  }
  const s = PKG_STYLE[name as PackageColor] ?? PKG_FALLBACK;
  if (muted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
        <span className={cn('h-2.5 w-2.5 rounded-full', s.dot)} />
        {name}
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', s.bg, s.text)}>
      <span className={cn('h-2 w-2 rounded-full', s.dot)} />
      {name}
    </span>
  );
}

// ── Status badge ────────────────────────────────────────────────────────
const STATUS_STYLE: Record<CustomerStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  inactive: 'bg-slate-100 text-slate-500 ring-slate-500/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', STATUS_STYLE[status])}>
      {status}
    </span>
  );
}

// ── Method badge ────────────────────────────────────────────────────────
const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  jazz: 'JazzCash',
  bank: 'Bank',
  other: 'Other',
};
export function MethodBadge({ method }: { method: PaymentMethod }) {
  const styles: Record<PaymentMethod, string> = {
    cash: 'bg-emerald-50 text-emerald-700',
    jazz: 'bg-orange-50 text-orange-700',
    bank: 'bg-blue-50 text-blue-700',
    other: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={cn('inline-flex rounded px-1.5 py-0.5 text-xs font-medium', styles[method])}>
      {METHOD_LABEL[method]}
    </span>
  );
}

// ── Account chip ────────────────────────────────────────────────────────
export function AccountChip({ name, inHouse }: { name: string; inHouse?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        inHouse ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'
      )}
    >
      {name}
    </span>
  );
}

// ── Overdue / arrears warning badge ─────────────────────────────────────
// Flags customers carrying a balance for 2+ consecutive months.
export function OverdueBadge({ months, className }: { months: number; className?: string }) {
  if (months < 2) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-600/20',
        className
      )}
      title={`${months} months overdue`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      {months}mo overdue
    </span>
  );
}

// ── Avatar ──────────────────────────────────────────────────────────────
export function Avatar({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-semibold text-white',
        className ?? 'h-8 w-8'
      )}
    >
      {label}
    </span>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  // Portal to <body> so the fixed overlay is relative to the viewport — not to a
  // transformed/`backdrop-filter` ancestor (e.g. the top bar), which would trap
  // and clip it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

// ── Pagination ──────────────────────────────────────────────────────────
export function Pagination({
  page,
  pages,
  total,
  pageSize = 12,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize?: number;
  onChange: (p: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[13px] text-slate-500">
      <span>
        Showing <b className="text-slate-700">{from}</b>–<b className="text-slate-700">{to}</b> of{' '}
        <b className="text-slate-700">{total}</b>
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Prev
        </button>
        <span className="px-2 text-[12.5px]">
          Page <b className="text-slate-700">{page}</b> / {pages}
        </span>
        <button
          onClick={() => onChange(Math.min(pages, page + 1))}
          disabled={page >= pages}
          className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ── Load error ──────────────────────────────────────────────────────────
export function LoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-semibold text-red-800">Couldn't load this data</p>
      <p className="mt-1 text-[13px] text-red-600">{message}</p>
      <button
        onClick={() => location.reload()}
        className="mt-4 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Reload
      </button>
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────
export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-[13px] text-slate-400">{hint}</p>}
    </div>
  );
}
