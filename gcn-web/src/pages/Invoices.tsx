import { useMemo, useState } from 'react';
import { FileText, Printer, Plus, Download, Search } from 'lucide-react';
import { api } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate } from '../lib/format';
import type { Customer, Invoice, OrgSettings } from '../types';
import { Card, Button, Modal, cn } from '../components/ui/primitives';
import Logo from '../components/Logo';

export default function Invoices() {
  const [reload, setReload] = useState(0);
  const { data: invoices, loading } = useApi(() => api.invoices(), [reload]);
  const { data: orgSettings } = useApi(() => api.orgSettings(), []);
  const { data: customers } = useApi(() => api.customers(), []);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = selected ?? invoices?.[0] ?? null;

  const openPdf = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await api.openInvoicePdf(active.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
      {/* List */}
      <div className="space-y-3">
        <Button variant="primary" className="w-full" onClick={() => setGenOpen(true)}>
          <Plus size={16} /> Generate new invoice
        </Button>

        <GenerateInvoiceModal
          open={genOpen}
          onClose={() => setGenOpen(false)}
          customers={customers ?? []}
          onDone={(inv) => {
            setGenOpen(false);
            setSelected(inv);
            setReload((r) => r + 1);
          }}
        />
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 text-[13px] font-medium text-slate-600">
            Commercial invoices
          </div>
          <div className="divide-y divide-slate-50">
            {loading && <div className="px-4 py-8 text-center text-sm text-slate-400">Loading…</div>}
            {invoices?.map((inv) => {
              const cust = customers?.find((c) => c.id === inv.customerId);
              const isActive = active?.id === inv.id;
              return (
                <button
                  key={inv.id}
                  onClick={() => setSelected(inv)}
                  className={cn('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50', isActive && 'bg-brand-50')}
                >
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500')}>
                    <FileText size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-slate-800">{cust?.companyName ?? cust?.name}</div>
                    <div className="text-[12px] text-slate-400">
                      {inv.invoiceNo} · {inv.periodLabel}
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700">{formatPKR(inv.totalAmount)}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Preview */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-slate-700">Invoice preview</h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={openPdf} disabled={!active || busy}>
              <Download size={14} /> {busy ? 'Opening…' : 'PDF'}
            </Button>
            <Button size="sm" variant="primary" onClick={openPdf} disabled={!active || busy}>
              <Printer size={14} /> Print
            </Button>
          </div>
        </div>
        {active && orgSettings ? (
          <InvoicePreview invoice={active} customers={customers ?? []} org={orgSettings} />
        ) : (
          <Card className="p-10 text-center text-slate-400">Select an invoice</Card>
        )}
      </div>
    </div>
  );
}

function GenerateInvoiceModal({
  open,
  onClose,
  customers,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  onDone: (inv: Invoice) => void;
}) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Customer | null>(null);
  const [period, setPeriod] = useState('July 2026');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const results = useMemo(() => {
    const list = [...customers].sort((a, b) => Number(b.type === 'commercial') - Number(a.type === 'commercial'));
    if (!q) return list.slice(0, 6);
    const s = q.toLowerCase();
    return list.filter((c) => `${c.name} ${c.loginId} ${c.companyName ?? ''}`.toLowerCase().includes(s)).slice(0, 6);
  }, [q, customers]);

  const submit = async () => {
    if (!picked) return;
    setSaving(true);
    setError('');
    try {
      const inv = await api.generateInvoice({ customerId: picked.id, periodLabel: period });
      onDone(inv);
      setPicked(null);
      setQ('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate invoice">
      <div className="space-y-3">
        {picked ? (
          <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50/50 px-3 py-2">
            <div>
              <div className="text-[13px] font-semibold text-slate-800">{picked.companyName ?? picked.name}</div>
              <div className="text-[12px] text-slate-500">{picked.loginId}</div>
            </div>
            <button onClick={() => setPicked(null)} className="text-[12px] font-medium text-brand-600">
              Change
            </button>
          </div>
        ) : (
          <div>
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search customer (commercial shown first)…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div className="mt-1.5 max-h-56 overflow-y-auto rounded-lg border border-slate-100">
              {results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setPicked(c)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50"
                >
                  <div>
                    <div className="text-[13px] font-medium text-slate-800">{c.companyName ?? c.name}</div>
                    <div className="text-[12px] text-slate-400">{c.loginId}</div>
                  </div>
                  {c.type === 'commercial' && (
                    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">Commercial</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Billing period</label>
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="e.g. July 2026"
          />
        </div>

        <p className="text-[12px] text-slate-400">
          A line item is auto-filled from the customer's package &amp; price. You can print or download the PDF after generating.
        </p>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!picked || saving}>
            {saving ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function InvoicePreview({ invoice, customers, org }: { invoice: Invoice; customers: Customer[]; org: OrgSettings }) {
  const cust = customers.find((c) => c.id === invoice.customerId);
  const orgSettings = org;
  if (!cust) return null;
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
      {/* Letterhead */}
      <div className="flex items-start justify-between border-b-2 border-brand-700 pb-5">
        <Logo variant="light" size={52} />
        <div className="text-right text-[12px] text-slate-500">
          <div className="font-semibold text-slate-700">{orgSettings.businessName}</div>
          <div>{orgSettings.officeAddress}</div>
          <div>{orgSettings.officeContact1}</div>
          <div>{orgSettings.officeContact2}</div>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Invoice to</div>
          <div className="mt-1 font-semibold text-slate-800">{cust.companyName ?? cust.name}</div>
          <div className="max-w-[240px] text-[13px] text-slate-500">{cust.billingAddress}</div>
        </div>
        <div className="text-right text-[13px]">
          <Row label="Invoice #" value={invoice.invoiceNo} />
          <Row label="Issue date" value={formatDate(invoice.issueDate)} />
          <Row label="Period" value={invoice.periodLabel} />
        </div>
      </div>

      {/* Line items */}
      <table className="mt-6 w-full text-left text-[13px]">
        <thead>
          <tr className="border-y border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 text-center font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Unit</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((li, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-3 text-slate-700">{li.description}</td>
              <td className="py-3 text-center text-slate-600">{li.qty}</td>
              <td className="py-3 text-right text-slate-600">{formatPKR(li.unitPrice)}</td>
              <td className="py-3 text-right font-medium text-slate-800">{formatPKR(li.qty * li.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-56 space-y-1.5">
          <div className="flex justify-between text-[13px] text-slate-500">
            <span>Subtotal</span>
            <span>{formatPKR(invoice.totalAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5 text-base font-bold text-slate-800">
            <span>Total</span>
            <span>{formatPKR(invoice.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Payment terms / JazzCash */}
      <div className="mt-6 rounded-lg bg-slate-50 p-4 text-[12px] text-slate-600">
        <div className="font-semibold text-slate-700">Payment details</div>
        <div className="mt-1">
          JazzCash — <b>{orgSettings.jazzCashTitle}</b> · {orgSettings.jazzCashNumber}
        </div>
        <div className="mt-0.5 text-slate-400">Connection tech: {orgSettings.connectionTech}</div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
        {orgSettings.businessName} · {orgSettings.officeContact1} · {orgSettings.officeContact2} · {orgSettings.officeAddress}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-end gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
