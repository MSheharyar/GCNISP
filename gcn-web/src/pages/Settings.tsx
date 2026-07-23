import { Save, AlertTriangle } from 'lucide-react';
import { api, lookup } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR } from '../lib/format';
import { Card, CardHeader, PackageTag, Button, cn } from '../components/ui/primitives';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export default function Settings() {
  const { data: settings } = useApi(() => api.orgSettings(), []);
  const { data: packages } = useApi(() => api.packages(), []);
  const { data: accounts } = useApi(() => api.accounts(), []);
  const { data: speedMap } = useApi(() => api.speedMap(), []);

  return (
    <div className="max-w-4xl space-y-5">
      {/* Org details */}
      <Card className="p-5">
        <CardHeader title="Organization details" subtitle="Used on invoices, receipts, and the app footer." />
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
          <Field label="Business name" value={settings?.businessName} />
          <Field label="Office address" value={settings?.officeAddress} />
          <Field label="Office contact 1" value={settings?.officeContact1} />
          <Field label="Office contact 2" value={settings?.officeContact2} />
          <Field label="Connection tech" value={settings?.connectionTech} />
        </div>
      </Card>

      {/* JazzCash */}
      <Card className="p-5">
        <CardHeader title="JazzCash payment details" subtitle="Shown on receipts and invoices so customers know where to send jazz payments." />
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
          <Field label="Account title" value={settings?.jazzCashTitle} />
          <Field label="JazzCash number" value={settings?.jazzCashNumber} />
        </div>
      </Card>

      {/* Packages (global price list) */}
      <Card className="overflow-hidden">
        <CardHeader title="Global package price list" subtitle="One shared list for all accounts. Color = package identity." />
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2.5 font-medium">Package</th>
              <th className="px-4 py-2.5 font-medium">Speed</th>
              <th className="px-4 py-2.5 text-right font-medium">Standard price</th>
              <th className="px-5 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {packages?.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <PackageTag name={p.name} />
                </td>
                <td className="px-4 py-3 text-[13px] text-slate-600">Up to {p.speedMbps} MB</td>
                <td className="px-4 py-3 text-right font-medium text-slate-800">{formatPKR(p.price)}</td>
                <td className="px-5 py-3 text-right">
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Connect speed → package mapping */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Connect speed → package mapping"
          subtitle="The Connect portal lists speeds that don't line up 1:1 with GCN colors. This resolves them during nightly sync."
        />
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
              <th className="px-5 py-2.5 font-medium">Connect speed label</th>
              <th className="px-4 py-2.5 font-medium">Maps to GCN package</th>
              <th className="px-5 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {speedMap?.map((m) => {
              const pkg = lookup.package(m.packageId);
              return (
                <tr key={m.speedLabel} className={cn('hover:bg-slate-50', m.packageId === null && 'bg-amber-50/40')}>
                  <td className="px-5 py-3 font-mono text-[13px] text-slate-600">{m.speedLabel}</td>
                  <td className="px-4 py-3">
                    <select defaultValue={m.packageId ?? ''} className={cn(inputCls, 'max-w-xs')}>
                      <option value="">— Unmapped (imports land package-unset) —</option>
                      {packages?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · up to {p.speedMbps} MB
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {m.packageId === null ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <AlertTriangle size={12} /> Needs mapping
                      </span>
                    ) : (
                      <PackageTag name={pkg?.name} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Providers & accounts */}
      <Card className="p-5">
        <CardHeader title="Providers & accounts" subtitle="Account = which provider carries the connection." />
        <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-3">
          {accounts?.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-800">{a.name}</div>
              <div className="text-[12px] text-slate-400">{a.notes}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Connect portal credentials (for nightly sync) */}
      <Card className="p-5">
        <CardHeader
          title="Connect portal credentials"
          subtitle="Stored encrypted, server-side — used by the nightly sync to log into each Connect account. Fiber ISP is in-house (no portal)."
        />
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
          {accounts
            ?.filter((a) => lookup.provider(a.providerId)?.type === 'reseller')
            .map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{a.name}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connected
                  </span>
                </div>
                <div className="space-y-2">
                  <input className={inputCls} placeholder="Portal username" defaultValue={a.name.toLowerCase()} />
                  <input type="password" className={inputCls} placeholder="Portal password" defaultValue="••••••••" />
                </div>
              </div>
            ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary">
          <Save size={15} /> Save settings
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[12.5px] font-medium text-slate-600">{label}</label>
      <input defaultValue={value} className={inputCls} />
    </div>
  );
}
