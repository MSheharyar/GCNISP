import { useEffect, useMemo, useState } from 'react';
import { Zap, Search, Check, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import type { Customer, PaymentMethod } from '../types';
import { formatPKR } from '../lib/format';
import { Modal, Button, Avatar, cn } from './ui/primitives';
import { initials } from '../lib/format';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'jazz', label: 'JazzCash' },
  { value: 'bank', label: 'Bank' },
  { value: 'other', label: 'Other' },
];

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Global quick-payment entry — the web equivalent of the mobile app's
 * "Record payment" sheet. Search a customer, amount pre-filled to their
 * outstanding, pick a method, record. Payment-only (collects arrears), no
 * new charge — for that use Log Charge + Payment.
 */
export default function QuickPayment({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Customer | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [date, setDate] = useState(TODAY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ name: string; amount: number } | null>(null);

  useEffect(() => {
    if (open && !customers) api.customers().then(setCustomers);
  }, [open, customers]);

  const reset = () => {
    setQ('');
    setPicked(null);
    setAmount('');
    setMethod('cash');
    setDate(TODAY);
    setError('');
    setDone(null);
  };

  const close = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const results = useMemo(() => {
    const list = customers ?? [];
    if (!q.trim()) return list.filter((c) => c.outstandingBalance > 0).slice(0, 8);
    const s = q.toLowerCase();
    return list.filter((c) => `${c.name} ${c.loginId} ${c.companyName ?? ''}`.toLowerCase().includes(s)).slice(0, 8);
  }, [q, customers]);

  const pick = (c: Customer) => {
    setPicked(c);
    setAmount(c.outstandingBalance > 0 ? String(c.outstandingBalance) : '');
  };

  const amt = Number(amount) || 0;

  const submit = async () => {
    if (!picked || amt <= 0) return;
    setSaving(true);
    setError('');
    try {
      await api.logChargePayment(picked.id, {
        logPayment: true,
        receivedAmount: amt,
        receivedDate: date,
        method,
      });
      setDone({ name: picked.name, amount: amt });
      // refresh the customer cache so the next search shows the new balance
      api.customers().then(setCustomers);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Quick payment">
      {done ? (
        <div className="py-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Check size={24} />
          </div>
          <div className="mt-3 text-[15px] font-semibold text-slate-800">{formatPKR(done.amount)} recorded</div>
          <p className="mt-0.5 text-[13px] text-slate-500">Payment from {done.name} added.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={close}>
              Done
            </Button>
            <Button variant="primary" onClick={reset}>
              <Zap size={15} /> Record another
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!picked ? (
            <>
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer (owing shown first)…" className={cn(inputCls, 'pl-9')} />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-100">
                {customers == null ? (
                  <div className="flex justify-center py-8 text-slate-400"><Loader2 size={18} className="animate-spin" /></div>
                ) : results.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No customers found.</div>
                ) : (
                  results.map((c) => (
                    <button key={c.id} onClick={() => pick(c)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                      <Avatar label={initials(c.name)} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-slate-800">{c.companyName ?? c.name}</div>
                        <div className="text-[12px] text-slate-400">{c.loginId}</div>
                      </div>
                      <span className={cn('text-[13px] font-semibold', c.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                        {c.outstandingBalance > 0 ? formatPKR(c.outstandingBalance) : 'clear'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar label={initials(picked.name)} />
                  <div>
                    <div className="text-[13px] font-semibold text-slate-800">{picked.companyName ?? picked.name}</div>
                    <div className="text-[12px] text-slate-500">{picked.loginId} · owes {formatPKR(picked.outstandingBalance)}</div>
                  </div>
                </div>
                <button onClick={() => setPicked(null)} className="text-[12px] font-medium text-brand-600">Change</button>
              </div>

              <div>
                <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Amount received</label>
                <input
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  className={cn(inputCls, 'text-lg font-semibold')}
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Method</label>
                  <div className="flex flex-wrap gap-1.5">
                    {METHODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setMethod(m.value)}
                        className={cn('rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium', method === m.value ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </div>
              </div>

              {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={close}>Cancel</Button>
                <Button variant="primary" onClick={submit} disabled={amt <= 0 || saving}>
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Record {amt > 0 ? formatPKR(amt) : 'payment'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
