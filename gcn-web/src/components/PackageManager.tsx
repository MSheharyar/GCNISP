import { useEffect, useState } from 'react';
import { Plus, Pencil, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { Package, PackagePayload } from '../types';
import { formatPKR } from '../lib/format';
import { Card, CardHeader, PackageTag, Button, Modal, cn } from './ui/primitives';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

/**
 * Per-dealer package price list. Dealers on other portals set their own name,
 * speed, the customer price, and their upstream cost — the margin (price − cost)
 * is shown so they can see what they keep.
 */
export default function PackageManager() {
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [editing, setEditing] = useState<Package | 'new' | null>(null);

  const load = () => api.packages().then(setPackages);
  useEffect(() => {
    load();
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Package price list"
        subtitle="Your own packages. Set the customer price and (optionally) your upstream cost to track margin."
        action={
          <Button variant="primary" size="sm" onClick={() => setEditing('new')}>
            <Plus size={15} /> Add package
          </Button>
        }
      />
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
            <th className="px-5 py-2.5 font-medium">Package</th>
            <th className="px-4 py-2.5 font-medium">Speed</th>
            <th className="px-4 py-2.5 text-right font-medium">Cost</th>
            <th className="px-4 py-2.5 text-right font-medium">Price</th>
            <th className="px-4 py-2.5 text-right font-medium">Margin</th>
            <th className="px-4 py-2.5 text-center font-medium">Status</th>
            <th className="px-5 py-2.5 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {packages?.map((p) => {
            const margin = p.cost != null ? p.price - p.cost : null;
            return (
              <tr key={p.id} className={cn('hover:bg-slate-50', !p.isActive && 'opacity-50')}>
                <td className="px-5 py-3">
                  <PackageTag name={p.name} />
                </td>
                <td className="px-4 py-3 text-[13px] text-slate-600">Up to {p.speedMbps} MB</td>
                <td className="px-4 py-3 text-right text-slate-500">{p.cost != null ? formatPKR(p.cost) : '—'}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">{formatPKR(p.price)}</td>
                <td className={cn('px-4 py-3 text-right font-medium', margin == null ? 'text-slate-400' : margin >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {margin != null ? formatPKR(margin) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                    {p.isActive ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                    <Pencil size={14} /> Edit
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <PackageModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </Card>
  );
}

function PackageModal({ target, onClose, onSaved }: { target: Package | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const pkg = target && target !== 'new' ? target : null;
  const [name, setName] = useState('');
  const [speed, setSpeed] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setName(pkg?.name ?? '');
    setSpeed(pkg ? String(pkg.speedMbps) : '');
    setPrice(pkg ? String(pkg.price) : '');
    setCost(pkg?.cost != null ? String(pkg.cost) : '');
    setActive(pkg?.isActive ?? true);
    setError(null);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: PackagePayload = {
        name: name.trim(),
        speedMbps: Number(speed) || 0,
        price: Number(price) || 0,
        cost: cost.trim() === '' ? null : Number(cost),
        isActive: active,
      };
      if (pkg) await api.updatePackage(pkg.id, payload);
      else await api.createPackage(payload);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save package.');
    } finally {
      setSaving(false);
    }
  };

  const margin = cost.trim() !== '' && price.trim() !== '' ? Number(price) - Number(cost) : null;

  return (
    <Modal open={!!target} onClose={onClose} title={pkg ? 'Edit package' : 'Add package'}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Package name</label>
          <input className={inputCls} placeholder="e.g. 50 MB" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Speed (Mbps)</label>
          <input className={inputCls} type="number" inputMode="numeric" placeholder="50" value={speed} onChange={(e) => setSpeed(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Your cost (optional)</label>
            <input className={inputCls} type="number" inputMode="numeric" placeholder="—" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Customer price</label>
            <input className={inputCls} type="number" inputMode="numeric" placeholder="2500" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        {margin != null && (
          <div className={cn('rounded-lg px-3 py-2 text-[13px]', margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
            Margin per customer: <span className="font-semibold">{formatPKR(margin)}</span>
          </div>
        )}
        <label className="flex items-center gap-2 text-[13px] text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Active (show in charge dropdowns)
        </label>

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim() || saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} {pkg ? 'Save' : 'Add package'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
