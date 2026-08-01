import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, Loader2 } from 'lucide-react';
import Logo, { LogoMark } from '../components/Logo';
import { useAuth } from '../services/auth';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(600px circle at 30% 20%, #2f83f7, transparent)' }}
        />
        <Logo variant="dark" size={40} />
        <div className="relative">
          <h1 className="max-w-sm text-3xl font-semibold leading-tight text-white">
            Subscriber management, built for the daily loop.
          </h1>
          <p className="mt-3 max-w-sm text-[15px] text-slate-300">
            Log this month's charge and payment as fast as an Excel row — with the ledger math, arrears, and reporting done for you.
          </p>
          <div className="mt-8 flex gap-6 text-sm text-slate-400">
            <div>
              <div className="text-2xl font-bold text-white">72+</div>
              subscribers
            </div>
            <div>
              <div className="text-2xl font-bold text-white">3</div>
              accounts
            </div>
            <div>
              <div className="text-2xl font-bold text-white">6</div>
              package tiers
            </div>
          </div>
        </div>
        <div className="relative text-[12px] text-slate-500">Global Cable Network · Korangi, Karachi</div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center bg-canvas p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <LogoMark size={48} />
          </div>
          <h2 className="text-2xl font-semibold text-slate-800">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to the GCN operations console.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="you@gcn.pk"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-slate-400">
            Protected by Sanctum · session timeout · audit logging
          </p>
        </div>
      </div>
    </div>
  );
}
