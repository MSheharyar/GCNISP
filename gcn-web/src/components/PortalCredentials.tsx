import { useEffect, useState } from 'react';
import { Save, Check, Loader2 } from 'lucide-react';
import { api, type PortalAccount } from '../services/api';
import { Card, CardHeader, Button, cn } from './ui/primitives';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const SOURCE_LABEL: Record<string, string> = {
  connect: 'Connect (reseller portal)',
  fiberbeam: 'Fiber Beam (in-house panel)',
};

/**
 * Per-dealer portal login. Each dealer enters their OWN portal credentials here;
 * the nightly sync uses them to pull recharges. Passwords are write-only —
 * the server never sends them back, so we only submit a new one when typed.
 */
export default function PortalCredentials() {
  const [accounts, setAccounts] = useState<PortalAccount[] | null>(null);

  useEffect(() => {
    api.portalAccounts().then(setAccounts);
  }, []);

  if (!accounts) return null;

  const portalAccounts = accounts.filter((a) => a.source); // only portal-capable accounts

  return (
    <Card className="p-5">
      <CardHeader
        title="Portal credentials"
        subtitle="Your own portal logins, stored encrypted server-side. The nightly sync uses these to import recharges. Enter data manually for any portal you don't connect here."
      />
      {portalAccounts.length === 0 ? (
        <p className="pt-4 text-sm text-slate-400">No portal-capable accounts yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
          {portalAccounts.map((a) => (
            <PortalCard key={a.id} account={a} onSaved={(u) => setAccounts((prev) => prev!.map((x) => (x.id === u.id ? u : x)))} />
          ))}
        </div>
      )}
    </Card>
  );
}

function PortalCard({ account, onSaved }: { account: PortalAccount; onSaved: (a: PortalAccount) => void }) {
  const [username, setUsername] = useState(account.username ?? '');
  const [password, setPassword] = useState(''); // blank = leave unchanged
  const [dealer, setDealer] = useState(account.dealer ?? '');
  const [enabled, setEnabled] = useState(account.enabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.updatePortalAccount(account.id, {
        source: account.source,
        username: username.trim() || null,
        password: password ? password : undefined, // omit → keep existing
        dealer: dealer.trim() || null,
        enabled,
      });
      onSaved(updated);
      setPassword('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-800">{account.name}</div>
          <div className="text-[11.5px] text-slate-400">{SOURCE_LABEL[account.source!] ?? account.source}</div>
        </div>
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            'relative h-5 w-9 rounded-full transition-colors',
            enabled ? 'bg-emerald-500' : 'bg-slate-300'
          )}
          aria-label="Toggle sync"
        >
          <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', enabled ? 'left-4' : 'left-0.5')} />
        </button>
      </div>

      <div className="space-y-2">
        <input className={inputCls} placeholder="Portal username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          type="password"
          className={inputCls}
          placeholder={account.hasPassword ? 'Password set — type to change' : 'Portal password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {account.source === 'fiberbeam' && (
          <input className={inputCls} placeholder="Dealer slug (e.g. gcndigital)" value={dealer} onChange={(e) => setDealer(e.target.value)} />
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {saved && (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600">
            <Check size={13} /> Saved
          </span>
        )}
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save
        </Button>
      </div>
    </div>
  );
}
