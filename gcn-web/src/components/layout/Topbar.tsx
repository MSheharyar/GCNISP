import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, LogOut } from 'lucide-react';
import { Avatar } from '../ui/primitives';
import { useAuth } from '../../services/auth';
import { initials } from '../../lib/format';

export default function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const doLogout = async () => {
    await logout();
    navigate('/login');
  };
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? '';
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/85 px-6 backdrop-blur">
      <h1 className="shrink-0 whitespace-nowrap text-[15px] font-semibold text-slate-800">
        {greeting}, {firstName} <span aria-hidden>👋</span>
      </h1>

      <div className="relative ml-2 hidden max-w-md flex-1 md:block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          onFocus={() => navigate('/customers')}
          placeholder="Search customers, login IDs, sectors…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {user?.role !== 'viewer' && (
          <button
            onClick={() => navigate('/log')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
          >
            <Plus size={16} /> Log Charge + Payment
          </button>
        )}
        <button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>
        <div className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2">
          <Avatar label={user ? initials(user.name) : '–'} />
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-[13px] font-semibold text-slate-700">{user?.name ?? '—'}</div>
            <div className="text-[11px] capitalize text-slate-400">{user?.role ?? ''}</div>
          </div>
        </div>
        <button
          onClick={doLogout}
          title="Sign out"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
