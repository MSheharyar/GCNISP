import { useMemo, useState } from 'react';
import { FileText, Plus, Trash2, Search, Download, Loader2, Router, Cable, Wrench, PlusCircle } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate } from '../lib/format';
import type { Customer, Quotation, QuotationLineItem } from '../types';
import { Card, Button, cn } from '../components/ui/primitives';

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

type Row = { description: string; qty: string; unit: string; unitPrice: string };

const PRESETS: { label: string; icon: typeof Router; row: Row }[] = [
  { label: 'Router', icon: Router, row: { description: 'Router', qty: '1', unit: '', unitPrice: '' } },
  { label: 'Wire (per m)', icon: Cable, row: { description: 'Cat6 wire', qty: '', unit: 'm', unitPrice: '' } },
  { label: 'Labor', icon: Wrench, row: { description: 'Labor / installation', qty: '1', unit: '', unitPrice: '' } },
  { label: 'Custom', icon: PlusCircle, row: { description: '', qty: '1', unit: '', unitPrice: '' } },
];

const num = (s: string) => (s.trim() === '' ? 0 : Number(s) || 0);

export default function Quotations() {
  const [reload, setReload] = useState(0);
  const { data: quotations, loading } = useApi(() => api.quotations(), [reload]);
  const { data: customers } = useApi(() => api.customers(), []);
  const [busyId, setBusyId] = useState<number | null>(null);

  const openPdf = async (q: Quotation) => {
    setBusyId(q.id);
    try {
      await api.openQuotationPdf(q.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      <Builder customers={customers ?? []} onCreated={(q) => { setReload((r) => r + 1); openPdf(q); }} />

      {/* History */}
      <div>
        <h3 className="mb-3 text-[15px] font-semibold text-slate-700">Recent quotations</h3>
        <Card className="overflow-hidden">
          {loading && <div className="px-4 py-8 text-center text-sm text-slate-400">Loading…</div>}
          {quotations && quotations.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-slate-400">No quotations yet.</div>
          )}
          <div className="divide-y divide-slate-50">
            {quotations?.map((q) => {
              const who = q.customerId ? customers?.find((c) => c.id === q.customerId)?.name : q.recipientName;
              return (
                <div key={q.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <FileText size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-slate-800">{who ?? 'Unnamed'}</div>
                    <div className="text-[12px] text-slate-400">
                      {q.quotationNo} · {formatDate(q.issueDate)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-slate-700">{formatPKR(q.totalAmount)}</div>
                    <button
                      onClick={() => openPdf(q)}
                      disabled={busyId === q.id}
                      className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-600 hover:text-brand-700"
                    >
                      {busyId === q.id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Builder({ customers, onCreated }: { customers: Customer[]; onCreated: (q: Quotation) => void }) {
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [picked, setPicked] = useState<Customer | null>(null);
  const [q, setQ] = useState('');
  const [rName, setRName] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rAddr, setRAddr] = useState('');
  const [rows, setRows] = useState<Row[]>([{ description: 'Router', qty: '1', unit: '', unitPrice: '' }]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const results = useMemo(() => {
    if (!q) return customers.slice(0, 6);
    const s = q.toLowerCase();
    return customers.filter((c) => `${c.name} ${c.loginId} ${c.companyName ?? ''}`.toLowerCase().includes(s)).slice(0, 6);
  }, [q, customers]);

  const total = rows.reduce((sum, r) => sum + num(r.qty) * num(r.unitPrice), 0);

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = (row: Row) => setRows((rs) => [...rs, { ...row }]);
  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  const recipientOk = mode === 'existing' ? !!picked : rName.trim() !== '';
  const itemsOk = rows.some((r) => r.description.trim() !== '' && num(r.unitPrice) >= 0 && num(r.qty) > 0);
  const canSubmit = recipientOk && itemsOk && !saving;

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const lineItems: QuotationLineItem[] = rows
        .filter((r) => r.description.trim() !== '')
        .map((r) => ({ description: r.description.trim(), qty: num(r.qty), unit: r.unit.trim() || null, unitPrice: num(r.unitPrice) }));
      const created = await api.generateQuotation({
        customerId: mode === 'existing' ? picked?.id : null,
        recipientName: mode === 'new' ? rName.trim() : null,
        recipientPhone: mode === 'new' ? rPhone.trim() || null : null,
        recipientAddress: mode === 'new' ? rAddr.trim() || null : null,
        validUntil: validUntil || null,
        notes: notes.trim() || null,
        lineItems,
      });
      onCreated(created);
      // reset for the next one
      setRows([{ description: 'Router', qty: '1', unit: '', unitPrice: '' }]);
      setRName(''); setRPhone(''); setRAddr(''); setPicked(null); setQ(''); setValidUntil(''); setNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create quotation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold text-slate-800">New quotation</h3>
      <p className="mt-0.5 text-[12.5px] text-slate-400">For a new prospect or an existing customer. Add any items — router, wire, labour, etc.</p>

      {/* Recipient */}
      <div className="mt-4">
        <div className="mb-2 inline-flex rounded-lg bg-slate-100 p-0.5 text-[13px]">
          <button onClick={() => setMode('new')} className={cn('rounded-md px-3 py-1.5 font-medium', mode === 'new' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}>
            New / walk-in
          </button>
          <button onClick={() => setMode('existing')} className={cn('rounded-md px-3 py-1.5 font-medium', mode === 'existing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500')}>
            Existing customer
          </button>
        </div>

        {mode === 'new' ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input className={inputCls} placeholder="Recipient name *" value={rName} onChange={(e) => setRName(e.target.value)} />
            <input className={inputCls} placeholder="Phone" value={rPhone} onChange={(e) => setRPhone(e.target.value)} />
            <input className={cn(inputCls, 'sm:col-span-2')} placeholder="Address" value={rAddr} onChange={(e) => setRAddr(e.target.value)} />
          </div>
        ) : picked ? (
          <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
            <div>
              <div className="text-[13px] font-semibold text-slate-800">{picked.companyName ?? picked.name}</div>
              <div className="text-[12px] text-slate-500">{picked.loginId}</div>
            </div>
            <button onClick={() => setPicked(null)} className="text-[12px] font-medium text-brand-600">Change</button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customer…" className={cn(inputCls, 'pl-9')} />
            </div>
            <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-slate-100">
              {results.map((c) => (
                <button key={c.id} onClick={() => setPicked(c)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50">
                  <div>
                    <div className="text-[13px] font-medium text-slate-800">{c.companyName ?? c.name}</div>
                    <div className="text-[12px] text-slate-400">{c.loginId}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Line items */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12.5px] font-semibold uppercase tracking-wide text-slate-400">Items</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => addRow(p.row)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-50">
                <p.icon size={13} /> {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="w-16 px-2 py-2 text-center font-medium">Qty</th>
                <th className="w-16 px-2 py-2 text-center font-medium">Unit</th>
                <th className="w-28 px-2 py-2 text-right font-medium">Unit price</th>
                <th className="w-28 px-3 py-2 text-right font-medium">Amount</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-2 py-1.5">
                    <input className="w-full rounded-md border border-transparent px-1.5 py-1 outline-none hover:border-slate-200 focus:border-brand-400" placeholder="Item description" value={r.description} onChange={(e) => setRow(i, { description: e.target.value })} />
                  </td>
                  <td className="px-1 py-1.5">
                    <input className="w-full rounded-md border border-transparent px-1 py-1 text-center outline-none hover:border-slate-200 focus:border-brand-400" inputMode="decimal" placeholder="1" value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })} />
                  </td>
                  <td className="px-1 py-1.5">
                    <input className="w-full rounded-md border border-transparent px-1 py-1 text-center outline-none hover:border-slate-200 focus:border-brand-400" placeholder="—" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} />
                  </td>
                  <td className="px-1 py-1.5">
                    <input className="w-full rounded-md border border-transparent px-1.5 py-1 text-right outline-none hover:border-slate-200 focus:border-brand-400" inputMode="numeric" placeholder="0" value={r.unitPrice} onChange={(e) => setRow(i, { unitPrice: e.target.value })} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium text-slate-700">{formatPKR(num(r.qty) * num(r.unitPrice))}</td>
                  <td className="px-1 py-1.5 text-center">
                    <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-rose-500" aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={() => addRow({ description: '', qty: '1', unit: '', unitPrice: '' })} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-600 hover:text-brand-700">
          <Plus size={14} /> Add row
        </button>
      </div>

      {/* Meta + total */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Valid until</label>
          <input type="date" className={inputCls} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <div className="flex items-end justify-end">
          <div className="text-right">
            <div className="text-[12px] text-slate-400">Total</div>
            <div className="text-2xl font-bold text-slate-800">{formatPKR(total)}</div>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Notes (optional)</label>
        <textarea className={cn(inputCls, 'min-h-[60px] resize-y')} placeholder="Anything the customer should know…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      {error && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}

      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={submit} disabled={!canSubmit}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Generate quotation
        </Button>
      </div>
    </Card>
  );
}
