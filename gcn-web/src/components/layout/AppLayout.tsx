import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ErrorBoundary from '../ErrorBoundary';
import { useAuth } from '../../services/auth';

// Which module a route belongs to (unlisted = always-on core).
const ROUTE_MODULE: Record<string, string> = {
  '/log': 'internet',
  '/charged-today': 'internet',
  '/customers': 'internet',
  '/recovery': 'internet',
  '/monthly': 'monthly',
  '/connect-sync': 'sync',
  '/invoices': 'invoices',
  '/quotations': 'quotations',
  '/cable': 'cable',
  '/cashbook': 'cashbook',
  '/topups': 'topups',
  '/reports': 'reports',
  '/staff': 'staff',
};

export default function AppLayout() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  // Block routes for modules this dealer doesn't have (typed URLs / bookmarks).
  if (user && !user.isSuperAdmin && user.modules) {
    const key = Object.keys(ROUTE_MODULE).find((p) => pathname === p || pathname.startsWith(p + '/'));
    const mod = key ? ROUTE_MODULE[key] : null;
    if (mod && !user.modules.includes(mod)) return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="scrollbar-thin flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[1400px]">
            <ErrorBoundary key={pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
