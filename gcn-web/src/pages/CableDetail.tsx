import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Tv, MapPin, Banknote } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate, initials } from '../lib/format';
import { Card, CardHeader, StatusBadge, Avatar, Button, Modal, LoadError, cn } from '../components/ui/primitives';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export default function CableDetail() {
  const { id } = useParams();
  const cid = Number(id);
  const [reload, setReload] = useState(0);
  const [payOpen, setPayOpen] = useState(false);
  const { data: cust, loading, error } = useApi(() => api.cableCustomer(cid), [cid, reload]);
  const { data: ledger } = useApi(() => api.cableLedger(cid), [cid, reload]);

  if (error) return <LoadError message={error} />;
  if (loading || !cust) return <div className="h-80 animate-pulse rounded-xl bg-slate-200/70" />;

  return (
    <div className="space-y-5">
      <Link to="/cable" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Back to cable customers
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar label={cust.name ? initials(cust.name) : cust.houseNo.slice(0, 2)} className="h-14 w-14 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Tv size={16} className="text-violet-500" />
              <h2 className="text-xl font-semibold text-slate-800">{cust.name || `House ${cust.houseNo}`}</h2>
              <StatusBadge status={cust.status} />
            </div>
            <div className="mt-1 flex items-center gap-1 text-[13px] text-slate-500">
              <MapPin size={13} /> House {cust.houseNo} · Sector {cust.sector}
            </div>
          </div>
          <Button variant="primary" onClick={() => setPayOpen(true)}>
            <Banknote size={15} /> Log cable payment
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4">
          <Fact label="Monthly fee" value={formatPKR(cust.monthlyFee)} />
          <Fact label="Last paid" value={cust.lastPaidDate ? formatDate(cust.lastPaidDate) : '—'} />
          <Fact
            label="Balance"
            value={cust.balance > 0 ? formatPKR(cust.balance) : 'Clear'}
            tone={cust.balance > 0 ? 'text-red-600' : 'text-emerald-600'}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Cable ledger" subtitle="Monthly cable charge vs. what was collected at the office." />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 text-right font-medium">Charge</th>
                <th className="px-4 py-2.5 text-right font-medium">Paid</th>
                <th className="px-5 py-2.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ledger?.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-600">{formatDate(e.date)}</td>
                  <td className="px-4 py-3 text-[13px] font-medium text-slate-700">{e.label}</td>
                  <td className="px-4 py-3 text-right text-[13px] text-slate-600">{e.debit ? formatPKR(e.debit) : '—'}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-medium text-emerald-600">{e.credit ? formatPKR(e.credit) : '—'}</td>
                  <td className={cn('px-5 py-3 text-right text-[13px] font-semibold', e.balance > 0 ? 'text-red-600' : 'text-slate-500')}>
                    {formatPKR(e.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ledger && ledger.length === 0 && <div className="py-10 text-center text-sm text-slate-400">No cable activity yet.</div>}
      </Card>

      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Log cable payment">
        <CablePayForm
          fee={cust.monthlyFee}
          cableId={cust.id}
          onDone={() => {
            setPayOpen(false);
            setReload((r) => r + 1);
          }}
          onClose={() => setPayOpen(false)}
        />
      </Modal>
    </div>
  );
}

function CablePayForm({ fee, cableId, onDone, onClose }: { fee: number; cableId: number; onDone: () => void; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get('amount'));
    if (!amount || amount <= 0) {
      setError('Amount is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.logCablePayment(cableId, { amount, date: String(fd.get('date')) });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Amount (Rs)</label>
          <input name="amount" inputMode="numeric" defaultValue={fee || ''} className={inputCls} placeholder="0" />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Date</label>
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
        </div>
      </div>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Log payment'}
        </Button>
      </div>
    </form>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="text-[11.5px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cn('mt-1 font-semibold', tone ?? 'text-slate-800')}>{value}</div>
    </div>
  );
}
