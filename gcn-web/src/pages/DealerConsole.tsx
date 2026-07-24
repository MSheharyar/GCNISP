import { useEffect, useState } from 'react';
import { Plus, Building2, UserRound, Copy, Check, Loader2, Power, PowerOff, Palette } from 'lucide-react';
import { api, type Dealer, type DealerCreatePayload } from '../services/api';
import { Card, CardHeader, Button, Modal, cn } from '../components/ui/primitives';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  trial: 'bg-blue-50 text-blue-700',
  suspended: 'bg-rose-50 text-rose-700',
};

/**
 * The SaaS owner's console. Only a super-admin reaches this route. Create a
 * dealer (which provisions their workspace + approved main admin) and flip the
 * billing gate (active ⇄ suspended).
 */
export default function DealerConsole() {
  const [dealers, setDealers] = useState<Dealer[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [created, setCreated] = useState<Dealer | null>(null);
  const [branding, setBranding] = useState<Dealer | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => api.dealers().then(setDealers);
  useEffect(() => {
    load();
  }, []);

  const toggleStatus = async (d: Dealer) => {
    if (d.id === 1) return; // never suspend the owner's own tenant
    setBusyId(d.id);
    try {
      const next = d.status === 'suspended' ? 'active' : 'suspended';
      const updated = await api.updateDealer(d.id, { status: next });
      setDealers((prev) => prev!.map((x) => (x.id === d.id ? { ...x, status: updated.status } : x)));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-5xl space-y-5">
      <Card className="p-5">
        <CardHeader
          title="Dealer accounts"
          subtitle="Each dealer is an isolated workspace on this system. You approve their main admin and control the billing gate."
          action={
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              <Plus size={15} /> New dealer
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
          <Stat icon={<Building2 size={16} />} label="Dealers" value={dealers?.length ?? '—'} />
          <Stat icon={<Power size={16} />} label="Active" value={dealers?.filter((d) => d.status !== 'suspended').length ?? '—'} />
          <Stat icon={<PowerOff size={16} />} label="Suspended" value={dealers?.filter((d) => d.status === 'suspended').length ?? '—'} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2.5 font-medium">Dealer</th>
              <th className="px-4 py-2.5 font-medium">Contact</th>
              <th className="px-4 py-2.5 text-right font-medium">Users</th>
              <th className="px-4 py-2.5 text-right font-medium">Customers</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 text-right font-medium">Billing gate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {dealers?.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="font-semibold text-slate-800">{d.name}</div>
                  <div className="font-mono text-[11.5px] text-slate-400">{d.slug}</div>
                </td>
                <td className="px-4 py-3 text-[13px] text-slate-600">
                  {d.contactName || '—'}
                  {d.contactPhone && <div className="text-[11.5px] text-slate-400">{d.contactPhone}</div>}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">{d.users}</td>
                <td className="px-4 py-3 text-right text-slate-700">{d.customers}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_STYLE[d.status])}>
                    {d.status}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setBranding(d)}>
                      <Palette size={14} /> Brand
                    </Button>
                    {d.id === 1 ? (
                      <span className="text-[12px] text-slate-400">Owner</span>
                    ) : (
                      <Button
                        variant={d.status === 'suspended' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => toggleStatus(d)}
                        disabled={busyId === d.id}
                      >
                        {busyId === d.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : d.status === 'suspended' ? (
                          <>
                            <Power size={14} /> Activate
                          </>
                        ) : (
                          <>
                            <PowerOff size={14} /> Suspend
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {dealers && dealers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                  No dealers yet. Create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <CreateDealerModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(d) => {
          setShowCreate(false);
          setCreated(d);
          load();
        }}
      />

      <CredentialsModal dealer={created} onClose={() => setCreated(null)} />

      <BrandingModal
        dealer={branding}
        onClose={() => setBranding(null)}
        onSaved={(u) => {
          setBranding(null);
          setDealers((prev) => prev!.map((x) => (x.id === u.id ? u : x)));
        }}
      />
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</div>
      <div>
        <div className="text-lg font-semibold text-slate-800">{value}</div>
        <div className="text-[12px] text-slate-400">{label}</div>
      </div>
    </div>
  );
}

const EMPTY: DealerCreatePayload = {
  name: '',
  slug: '',
  contactName: '',
  contactPhone: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

function CreateDealerModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (d: Dealer) => void }) {
  const [form, setForm] = useState<DealerCreatePayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(EMPTY);
      setError(null);
    }
  }, [open]);

  const set = (k: keyof DealerCreatePayload) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: DealerCreatePayload = {
        name: form.name.trim(),
        slug: form.slug?.trim() || undefined,
        contactName: form.contactName?.trim() || undefined,
        contactPhone: form.contactPhone?.trim() || undefined,
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        adminPassword: form.adminPassword,
      };
      const dealer = await api.createDealer(payload);
      onCreated({ ...dealer, admin: dealer.admin ?? { id: 0, name: payload.adminName, email: payload.adminEmail } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create dealer.');
    } finally {
      setSaving(false);
    }
  };

  const valid = form.name.trim() && form.adminName.trim() && form.adminEmail.trim() && form.adminPassword.length >= 6;

  return (
    <Modal open={open} onClose={onClose} title="New dealer">
      <div className="space-y-3">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">Business</div>
        <input className={inputCls} placeholder="Business name *" value={form.name} onChange={set('name')} />
        <input className={inputCls} placeholder="URL slug (optional, e.g. starnet)" value={form.slug} onChange={set('slug')} />
        <div className="grid grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Contact name" value={form.contactName} onChange={set('contactName')} />
          <input className={inputCls} placeholder="Contact phone" value={form.contactPhone} onChange={set('contactPhone')} />
        </div>

        <div className="pt-1 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Approved main admin</div>
        <input className={inputCls} placeholder="Admin name *" value={form.adminName} onChange={set('adminName')} />
        <input className={inputCls} placeholder="Admin email *" value={form.adminEmail} onChange={set('adminEmail')} />
        <input className={inputCls} type="text" placeholder="Temporary password * (min 6)" value={form.adminPassword} onChange={set('adminPassword')} />

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid || saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create dealer
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CredentialsModal({ dealer, onClose }: { dealer: Dealer | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!dealer?.admin) return null;

  const text = `Business: ${dealer.name}\nLogin: ${dealer.admin.email}\nWorkspace: ${dealer.slug}`;
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={!!dealer} onClose={onClose} title="Dealer created">
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
          <Check size={15} /> {dealer.name}&rsquo;s workspace is provisioned and ready.
        </div>
        <div className="rounded-lg border border-slate-200">
          <Row icon={<Building2 size={15} />} label="Workspace" value={dealer.slug} />
          <Row icon={<UserRound size={15} />} label="Admin login" value={dealer.admin.email} />
        </div>
        <p className="text-[12px] leading-relaxed text-slate-500">
          Share the login + the temporary password you set. They can sign in immediately; suspend them anytime from this console.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy details'}
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0">
      <span className="text-slate-400">{icon}</span>
      <span className="w-24 text-[12px] text-slate-400">{label}</span>
      <span className="font-mono text-[13px] text-slate-700">{value}</span>
    </div>
  );
}

const DEFAULT_COLOR = '#1a66e0';

function BrandingModal({ dealer, onClose, onSaved }: { dealer: Dealer | null; onClose: () => void; onSaved: (d: Dealer) => void }) {
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [logo, setLogo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dealer) return;
    setColor(dealer.primaryColor ?? DEFAULT_COLOR);
    setLogo(dealer.logoUrl ?? '');
    setError(null);
  }, [dealer]);

  if (!dealer) return null;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateDealer(dealer.id, {
        primaryColor: color,
        logoUrl: logo.trim() || null,
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save branding.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateDealer(dealer.id, { primaryColor: null, logoUrl: null });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reset branding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!dealer} onClose={onClose} title={`Branding — ${dealer.name}`}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-slate-600">Primary colour</label>
          <div className="flex items-center gap-3">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#1a66e0"
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            {['#1a66e0', '#0f766e', '#7c3aed', '#dc2626', '#ea580c', '#059669', '#0891b2'].map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className="h-6 w-6 rounded-full ring-1 ring-black/10" style={{ background: c }} aria-label={c} />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-slate-600">Logo image URL</label>
          <div className="flex items-center gap-3">
            <img
              src={logo || undefined}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full bg-slate-100 object-cover ring-1 ring-black/10"
              onError={(e) => ((e.currentTarget.style.visibility = 'hidden'))}
              onLoad={(e) => ((e.currentTarget.style.visibility = 'visible'))}
            />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://…/logo.png"
            />
          </div>
          <p className="mt-1 text-[11.5px] text-slate-400">Square image works best. Leave blank to keep the default mark.</p>
        </div>

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}

        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" onClick={reset} disabled={saving}>
            Reset to default
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Palette size={15} />} Save branding
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
