import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, auth, bootstrapRefData, login as apiLogin, logout as apiLogout, me, type AuthUser } from './api';
import { LogoMark } from '../components/Logo';
import { applyBranding } from '../lib/branding';

interface AuthCtx {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (auth.token) {
        try {
          const [u] = await Promise.all([me(), bootstrapRefData()]);
          if (alive) setUser(u);
          try {
            applyBranding(await api.branding());
          } catch {
            /* branding is best-effort — never block sign-in */
          }
        } catch {
          auth.clear();
        }
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const value: AuthCtx = {
    user,
    login: async (email, password) => {
      const u = await apiLogin(email, password);
      setUser(u);
      try {
        applyBranding(await api.branding());
      } catch {
        /* best-effort */
      }
    },
    logout: async () => {
      await apiLogout();
      applyBranding(null); // reset to the default theme
      setUser(null);
    },
  };

  if (!ready) return <SplashLoader />;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

function SplashLoader() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-canvas">
      <div className="animate-pulse">
        <LogoMark size={48} />
      </div>
      <p className="text-sm text-slate-400">Loading GCN Operations…</p>
    </div>
  );
}
