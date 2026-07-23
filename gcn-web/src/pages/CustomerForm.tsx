import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Building2, Home, Wallet, HandCoins } from 'lucide-react';
import type { Account, CollectionModel, Customer, CustomerType, Package } from '../types';
import { api, lookup, type CustomerPayload } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR } from '../lib/format';
import { Card, CardHeader, Button, cn } from '../components/ui/primitives';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export default function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { data: existing, loading } = useApi(
    () => (id ? api.customer(Number(id)) : Promise.resolve(null as Customer | null)),
    [id]
  );
  const { data: accounts } = useApi(() => api.accounts(), []);
  const { data: packages } = useApi(() => api.packages(), []);

  if ((isEdit && loading) || !accounts || !packages) {
    return <div className="h-96 animate-pulse rounded-xl bg-slate-200/70" />;
  }
  return <CustomerFormInner existing={existing ?? null} accounts={accounts} packages={packages} isEdit={isEdit} />;
}

function CustomerFormInner({
  existing,
  accounts,
  packages,
  isEdit,
}: {
  existing: Customer | null;
  accounts: Account[];
  packages: Package[];
  isEdit: boolean;
}) {
  const navigate = useNavigate();
  const [type, setType] = useState<CustomerType>(existing?.type ?? 'residential');
  const [collectionModel, setCollectionModel] = useState<CollectionModel>(existing?.collectionModel ?? 'prepaid');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const str = (k: string) => String(fd.get(k) ?? '').trim();
    const num = (k: string) => {
      const v = str(k);
      return v === '' ? null : Number(v);
    };
    const payload: CustomerPayload = {
      name: str('name'),
      loginId: str('loginId'),
      type,
      companyName: type === 'commercial' ? str('companyName') : null,
      houseNo: str('houseNo'),
      sector: str('sector'),
      billingAddress: type === 'commercial' ? str('billingAddress') : null,
      currentAccountId: Number(fd.get('currentAccountId')),
      currentPackageId: fd.get('currentPackageId') ? Number(fd.get('currentPackageId')) : null,
      status: str('status') || 'active',
      phone: str('phone'),
      collectionModel,
      frozenAmount: num('frozenAmount'),
      typicalChargeDay: num('typicalChargeDay'),
    };
    if (!payload.name || !payload.loginId) {
      setError('Name and Login ID are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = existing ? await api.updateCustomer(existing.id, payload) : await api.createCustomer(payload);
      navigate(`/customers/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-5">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Back to customers
      </Link>

      <div>
        <h2 className="text-xl font-semibold text-slate-800">{isEdit ? 'Edit customer' : 'Add customer'}</h2>
        <p className="text-sm text-slate-500">
          {isEdit ? 'Update this subscriber’s details.' : 'A rare action — the roster is stable. Fill what you know; package can be set later.'}
        </p>
      </div>

      {/* type toggle */}
      <div className="grid grid-cols-2 gap-3">
        <TypeCard active={type === 'residential'} onClick={() => setType('residential')} icon={<Home size={18} />} title="Residential" desc="Home user · internal ledger" />
        <TypeCard active={type === 'commercial'} onClick={() => setType('commercial')} icon={<Building2 size={18} />} title="Commercial" desc="Company · needs PDF invoice" />
      </div>

      <Card className="p-5">
        <CardHeader title="Identity" />
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
          <Field label="Full name">
            <input name="name" defaultValue={existing?.name} className={inputCls} placeholder="e.g. Muhammad Ahmed" />
          </Field>
          <Field label="Login ID">
            <input name="loginId" defaultValue={existing?.loginId} className={inputCls} placeholder="gcn-1234" />
          </Field>
          {type === 'commercial' && (
            <Field label="Company name" className="sm:col-span-2">
              <input name="companyName" defaultValue={existing?.companyName ?? ''} className={inputCls} placeholder="e.g. TEXNET INTERNATIONAL (PVT) LTD" />
            </Field>
          )}
          <Field label="Phone">
            <input name="phone" defaultValue={existing?.phone} className={inputCls} placeholder="03xx-xxxxxxx" />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={existing?.status ?? 'active'} className={inputCls}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Location" />
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
          <Field label="House / plot no.">
            <input name="houseNo" defaultValue={existing?.houseNo} className={inputCls} placeholder="A-123" />
          </Field>
          <Field label="Sector / area">
            <input name="sector" defaultValue={existing?.sector} className={inputCls} placeholder="Sector 31-A" />
          </Field>
          {type === 'commercial' && (
            <Field label="Formal billing address" className="sm:col-span-2">
              <textarea name="billingAddress" defaultValue={existing?.billingAddress ?? ''} rows={2} className={inputCls} placeholder="Full address for invoice letterhead" />
            </Field>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <CardHeader title="Subscription" subtitle="Account is which provider carries them; package is the global color/speed tier." />
        <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
          <Field label="Current account">
            <select name="currentAccountId" defaultValue={existing?.currentAccountId} className={inputCls}>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {lookup.provider(a.providerId)?.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Package (optional)">
            <select name="currentPackageId" defaultValue={existing?.currentPackageId ?? ''} className={inputCls}>
              <option value="">Unset (backfill later)</option>
              {packages?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · up to {p.speedMbps} MB · {formatPKR(p.price)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frozen amount (optional override)" hint="Leave blank to use the package standard price.">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rs</span>
              <input
                name="frozenAmount"
                defaultValue={existing?.subscription.frozenAmount ?? ''}
                inputMode="numeric"
                className={cn(inputCls, 'pl-9')}
                placeholder="e.g. 1200 (legacy price)"
              />
            </div>
          </Field>
          <Field label="Typical charge day">
            <input
              name="typicalChargeDay"
              type="number"
              min={1}
              max={28}
              defaultValue={existing?.subscription.typicalChargeDay ?? ''}
              className={inputCls}
              placeholder="5"
            />
          </Field>
        </div>

        {/* Collection model — drives how Connect Sync treats a recharge */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-2 flex items-center gap-1.5">
            <label className="text-[12.5px] font-medium text-slate-600">Collection model</label>
            <span className="text-[11.5px] text-slate-400">— how this customer usually pays</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ModelCard
              active={collectionModel === 'prepaid'}
              onClick={() => setCollectionModel('prepaid')}
              icon={<Wallet size={17} />}
              title="Prepaid"
              desc="Pays me first, then I recharge. You still confirm each recharge as paid on Charged Today."
            />
            <ModelCard
              active={collectionModel === 'credit'}
              onClick={() => setCollectionModel('credit')}
              icon={<HandCoins size={17} />}
              title="Credit"
              desc="I may recharge before they pay. Confirm the payment on Charged Today when it arrives."
            />
          </div>
        </div>
      </Card>

      {error && <div className="rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-700">{error}</div>}

      <div className="flex justify-end gap-2">
        <Button type="button" onClick={() => navigate('/customers')}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          <Save size={15} /> {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}
        </Button>
      </div>
    </form>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-4 text-left transition',
        active ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>
        {icon}
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-[12px] text-slate-400">{desc}</div>
      </div>
    </button>
  );
}

function ModelCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 text-left transition',
        active ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>
        {icon}
      </span>
      <div>
        <div className="text-[13px] font-semibold text-slate-800">{title}</div>
        <div className="text-[11.5px] leading-snug text-slate-400">{desc}</div>
      </div>
    </button>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-[12.5px] font-medium text-slate-600">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11.5px] text-slate-400">{hint}</p>}
    </div>
  );
}
