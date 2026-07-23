import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, bootstrapRefData, login as apiLogin, logout as apiLogout, me, type AuthUser } from './api';
import { LogoMark } from '../components/Logo';

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
    login: async (email, password) => setUser(await apiLogin(email, password)),
    logout: async () => {
      await apiLogout();
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
