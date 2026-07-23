import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Zap,
  HandCoins,
  FileText,
  BarChart3,
  UserCog,
  Settings,
  RefreshCw,
  Tv,
  Wallet,
  Clock,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import Logo from '../Logo';
import { cn } from '../ui/primitives';
import { useAuth } from '../../services/auth';

// Restricted (viewer) staff only see these operational pages.
const VIEWER_PATHS = new Set(['/', '/charged-today', '/monthly', '/recovery']);

const SECTIONS: { title?: string; items: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean; highlight?: boolean }[] }[] = [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/log', label: 'Log Charge + Payment', icon: Zap, highlight: true },
      { to: '/charged-today', label: 'Charged Today', icon: Clock },
    ],
  },
  {
    title: 'Internet',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/monthly', label: 'Monthly Register', icon: CalendarDays },
      { to: '/connect-sync', label: 'Connect Sync', icon: RefreshCw },
      { to: '/recovery', label: 'Recovery List', icon: HandCoins },
      { to: '/invoices', label: 'Commercial Invoices', icon: FileText },
    ],
  },
  {
    title: 'TV Cable',
    items: [{ to: '/cable', label: 'Cable Subscribers', icon: Tv }],
  },
  {
    title: 'Money',
    items: [
      { to: '/cashbook', label: 'Cash Book', icon: Wallet },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/staff', label: 'Staff Management', icon: UserCog },
      { to: '/settings', label: 'Org Settings', icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const sections = isViewer
    ? SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => VIEWER_PATHS.has(i.to)) })).filter((s) => s.items.length)
    : SECTIONS;
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-ink-900 text-slate-300">
      {/* Logo slot */}
      <div className="flex h-16 items-center border-b border-white/5 px-5">
        <Logo variant="dark" size={34} />
      </div>

      {/* Team / account context card (MindMeister-style) */}
      <div className="px-3 pt-4">
        <div className="rounded-lg bg-ink-800 px-3 py-2.5">
          <div className="text-[13px] font-semibold text-white">GCN Operations</div>
          <div className="text-[11px] text-slate-400">Internet · Cable · Cash Book</div>
        </div>
      </div>

      <nav className="scrollbar-thin mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
        {sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <div className="px-3 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </div>
            )}
            {section.items.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        ))}
      </nav>

      {/* Upsell / help card */}
      <div className="p-3">
        <div className="rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 p-3.5">
          <div className="text-[13px] font-semibold text-white">Migrating from Excel?</div>
          <p className="mt-1 text-[11px] leading-relaxed text-brand-100">
            Import your 300–400 subscribers and opening balances in one step.
          </p>
          <button className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-white/15 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-white/25">
            Import data <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  highlight,
}: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  highlight?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
          isActive
            ? 'bg-brand-600 text-white shadow-sm'
            : highlight
              ? 'text-brand-200 hover:bg-ink-800'
              : 'text-slate-300 hover:bg-ink-800 hover:text-white'
        )
      }
    >
      <Icon size={17} className="shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
