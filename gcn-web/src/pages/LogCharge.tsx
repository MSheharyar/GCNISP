import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap, Check, Info, ArrowRightLeft, Banknote } from 'lucide-react';
import { api, lookup } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR } from '../lib/format';
import type { Customer, PaymentMethod } from '../types';
import { Card, Button, cn } from '../components/ui/primitives';
import CustomerPicker from '../components/CustomerPicker';

const TODAY = new Date().toISOString().slice(0, 10);
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Billing-period options around today (current first), so they never go stale.
const MONTHS = [0, 1, -1, -2].map((offset) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
});

function periodToYm(label: string): string {
  const [mn, y] = label.split(' ');
  const idx = MONTH_NAMES.indexOf(mn);
  return idx >= 0 && y ? `${y}-${String(idx + 1).padStart(2, '0')}` : TODAY.slice(0, 7);
}

// Charge date defaults to the customer's actual charge day in the billing month.
function chargeDateFor(period: string, typicalDay?: number | null): string {
  const ym = periodToYm(period);
  const [y, m] = ym.split('-').map(Number);
  const maxDay = new Date(y, m, 0).getDate();
  const day = Math.min(maxDay, Math.max(1, typicalDay || 1));
  return `${ym}-${String(day).padStart(2, '0')}`;
}

export default function LogCharge() {
  const { data: customers } = useApi(() => api.customers(), []);
  const { data: accounts } = useApi(() => api.accounts(), []);
  const { data: packages } = useApi(() => api.packages(), []);
  const [params] = useSearchParams();

  const [customer, setCustomer] = useState<Customer | null>(null);

  // charge fields
  const [addCharge, setAddCharge] = useState(true);
  const [period, setPeriod] = useState(MONTHS[0]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [packageId, setPackageId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [chargeDate, setChargeDate] = useState(TODAY);

  // payment fields
  const [logPayment, setLogPayment] = useState(true);
  const [applyMode, setApplyMode] = useState<'quick' | 'manual'>('quick');
  const [received, setReceived] = useState('');
  const [receivedDate, setReceivedDate] = useState(TODAY);
  const [method, setMethod] = useState<PaymentMethod>('cash');

  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // preselect customer from ?customer= query
  useEffect(() => {
    const id = params.get('customer');
    if (id && customers) {
      const c = customers.find((x) => x.id === Number(id));
      if (c) setCustomer(c);
    }
  }, [params, customers]);

  const collectMode = params.get('collect') === '1';

  // when customer picked, pre-fill from subscription
  useEffect(() => {
    if (!customer) return;
    setAccountId(customer.currentAccountId);
    setPackageId(customer.currentPackageId);
    const price =
      customer.subscription.frozenAmount ??
      lookup.package(customer.currentPackageId)?.price ??
      0;
    if (collectMode) {
      // Collecting arrears — no new charge, pre-fill the payment with what they owe.
      setAddCharge(false);
      setLogPayment(true);
      setReceived(customer.outstandingBalance ? String(customer.outstandingBalance) : '');
    } else {
      setAddCharge(true);
      setAmount(price ? String(price) : '');
      setReceived(price ? String(price) : '');
      setChargeDate(chargeDateFor(period, customer.subscription.typicalChargeDay));
    }
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, collectMode]);

  const switched = customer && accountId !== null && accountId !== customer.currentAccountId;

  const outstanding = customer?.outstandingBalance ?? 0;
  const receivedNum = Number(received) || 0;
  const isArrears = useMemo(() => {
    // if received month is later than the charge month it settles → arrears
    return logPayment && receivedDate.slice(0, 7) > chargeDate.slice(0, 7);
  }, [logPayment, receivedDate, chargeDate]);

  const chargeValid = addCharge && Number(amount) > 0;
  const paymentValid = logPayment && receivedNum > 0;
  const canSubmit = Boolean(customer) && (chargeValid || paymentValid) && !saving;

  const submit = async () => {
    if (!customer) return;
    if (addCharge && accountId == null) {
      setError('Pick an account for the charge.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.logChargePayment(customer.id, {
        ...(chargeValid
          ? { accountId, packageId, chargeAmount: Number(amount), chargeDate, billingPeriodLabel: period }
          : {}),
        logPayment,
        receivedAmount: paymentValid ? receivedNum : undefined,
        receivedDate: paymentValid ? receivedDate : undefined,
        method: paymentValid ? method : undefined,
      });
      setDone(true);
      setTimeout(() => {
        setCustomer(null);
        setDone(false);
        setAmount('');
        setReceived('');
      }, 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-brand-600 p-4 text-white">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
          <Zap size={20} />
        </div>
        <div>
          <h2 className="text-base font-semibold">The daily loop</h2>
          <p className="text-[13px] text-brand-100">
            Pick a customer, confirm the charge, log what they paid. As fast as an Excel row.
          </p>
        </div>
      </div>

      {/* 1. Customer */}
      <Card className="p-5">
        <Label step={1} title="Customer" />
        {customers ? (
          <CustomerPicker customers={customers} value={customer} onChange={setCustomer} />
        ) : (
          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
        )}
      </Card>

      {customer && (
        <>
          {/* 2. Charge */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Label step={2} title="This month's charge" hint="Mirrors one Excel row." noMargin />
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={addCharge}
                  onChange={(e) => setAddCharge(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Add a monthly charge
              </label>
            </div>

            {!addCharge && (
              <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-500">
                No new charge — you're just recording a payment against the existing balance
                {customer.outstandingBalance > 0 && <> ({formatPKR(customer.outstandingBalance)} outstanding)</>}.
              </div>
            )}

            {addCharge && (
            <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Billing period">
                <select
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    if (customer) setChargeDate(chargeDateFor(e.target.value, customer.subscription.typicalChargeDay));
                  }}
                  className={inputCls}
                >
                  {MONTHS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>

              <Field label="Charge date">
                <input type="date" value={chargeDate} onChange={(e) => setChargeDate(e.target.value)} className={inputCls} />
              </Field>

              <Field
                label="Account (provider)"
                hint={switched ? 'Switched — this charge is billed under the new account' : undefined}
              >
                <div className="relative">
                  <select
                    value={accountId ?? ''}
                    onChange={(e) => setAccountId(Number(e.target.value))}
                    className={cn(inputCls, switched && 'border-amber-300 ring-1 ring-amber-200')}
                  >
                    {accounts?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {lookup.provider(a.providerId)?.name}
                      </option>
                    ))}
                  </select>
                  {switched && (
                    <span className="absolute right-9 top-1/2 -translate-y-1/2 text-amber-500">
                      <ArrowRightLeft size={15} />
                    </span>
                  )}
                </div>
              </Field>

              <Field label="Package (optional — backfillable)">
                <select
                  value={packageId ?? ''}
                  onChange={(e) => setPackageId(e.target.value ? Number(e.target.value) : null)}
                  className={inputCls}
                >
                  <option value="">Unset</option>
                  {packages?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · up to {p.speedMbps} MB · {formatPKR(p.price)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Amount charged (PKR)" className="sm:col-span-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rs</span>
                  <input
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className={cn(inputCls, 'pl-9 text-base font-semibold')}
                    placeholder="0"
                  />
                  {customer.subscription.frozenAmount && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-600">
                      frozen price
                    </span>
                  )}
                </div>
              </Field>
            </div>

            {switched && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                <Info size={14} className="shrink-0" />
                Account switch: was <b className="mx-1">{lookup.account(customer.currentAccountId)?.name}</b>, now billing under{' '}
                <b className="mx-1">{lookup.account(accountId!)?.name}</b>. Package & price unchanged.
              </div>
            )}
            </>
            )}
          </Card>

          {/* 3. Payment */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <Label step={3} title="Payment" hint="Charge and payment are separate facts." noMargin />
              <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={logPayment}
                  onChange={(e) => setLogPayment(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Log a payment now
              </label>
            </div>

            {logPayment && (
              <>
                {/* apply mode toggle */}
                <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
                  {(['quick', 'manual'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setApplyMode(m)}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-[13px] font-medium capitalize transition',
                        applyMode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
                      )}
                    >
                      {m === 'quick' ? 'Quick apply (oldest first)' : 'Manual apply'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Amount received">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rs</span>
                      <input
                        inputMode="numeric"
                        value={received}
                        onChange={(e) => setReceived(e.target.value.replace(/[^0-9]/g, ''))}
                        className={cn(inputCls, 'pl-9 font-semibold')}
                        placeholder="0"
                      />
                    </div>
                  </Field>
                  <Field label="Received date">
                    <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Method">
                    <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={inputCls}>
                      <option value="cash">Cash</option>
                      <option value="jazz">JazzCash</option>
                      <option value="bank">Bank</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>

                {applyMode === 'quick' && outstanding > 0 && (
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-600">
                    <div className="flex justify-between">
                      <span>Prior outstanding</span>
                      <span className="font-medium text-red-600">{formatPKR(outstanding)}</span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span>After this payment (auto-settles oldest dues)</span>
                      <span className="font-semibold text-slate-800">
                        {formatPKR(Math.max(0, outstanding + Number(amount) - receivedNum))}
                      </span>
                    </div>
                  </div>
                )}

                {isArrears && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 text-[12.5px] text-orange-700">
                    <Info size={14} /> Received later than the billing month → auto-flagged as{' '}
                    <b className="mx-1">arrears / late payment</b>.
                  </div>
                )}
              </>
            )}
          </Card>

          {/* Submit bar */}
          <div className="sticky bottom-0 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="text-[13px] text-slate-500">
              {error ? (
                <span className="font-medium text-red-600">{error}</span>
              ) : (
                <>
                  <span className="font-medium text-slate-700">{customer.name}</span>
                  {addCharge && <> · charge {formatPKR(Number(amount) || 0)}</>}
                  {logPayment && <> · received {formatPKR(receivedNum)}</>}
                </>
              )}
            </div>
            <Button variant="primary" size="md" disabled={!canSubmit} onClick={submit} className="min-w-[160px]">
              {done ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : saving ? (
                <>Saving…</>
              ) : (
                <>
                  <Banknote size={16} /> Save entry
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

function Label({
  step,
  title,
  hint,
  noMargin,
}: {
  step: number;
  title: string;
  hint?: string;
  noMargin?: boolean;
}) {
  return (
    <div className={cn(!noMargin && 'mb-4', 'flex items-center gap-2.5')}>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[12px] font-bold text-brand-700">
        {step}
      </span>
      <div>
        <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
        {hint && <p className="text-[12px] text-slate-400">{hint}</p>}
      </div>
    </div>
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
      {hint && <p className="mt-1 text-[11.5px] text-amber-600">{hint}</p>}
    </div>
  );
}
