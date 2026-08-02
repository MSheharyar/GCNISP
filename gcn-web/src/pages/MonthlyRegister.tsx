import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Search, Check, Pencil, Trash2, Loader2 } from 'lucide-react';
import { api, type MonthlyRow } from '../services/api';
import { useApi } from '../lib/useApi';
import { useAuth } from '../services/auth';
import { formatPKR, formatDate } from '../lib/format';
import { Card, Pagination, PackageTag, LoadError, Modal, Button, cn } from '../components/ui/primitives';

const METHOD_LABEL: Record<string, string> = { cash: 'Cash', jazz: 'JazzCash', bank: 'Bank', other: 'Other' };
const PAGE_SIZE = 15;

export default function MonthlyRegister() {
  const { user } = useAuth();
  const canEdit = user?.role !== 'viewer';
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [reload, setReload] = useState(0);
  const { data, loading, error } = useApi(() => api.monthly(month), [month, reload]);
  const { data: accountsRef } = useApi(() => api.accounts(), []);
  const { data: packagesRef } = useApi(() => api.packages(), []);
  const [q, setQ] = useState('');
  const [account, setAccount] = useState('all');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<MonthlyRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const refresh = () => setReload((r) => r + 1);
  const del = async (row: MonthlyRow) => {
    if (!confirm(`Delete this ${formatDate(row.chargeDate)} charge for ${row.name}? It can be restored from the audit log.`)) return;
    setDeletingId(row.chargeId);
    try {
      await api.deleteCharge(row.chargeId);
      refresh();
    } finally {
      setDeletingId(null);
    }
  };

  const accounts = useMemo(() => Array.from(new Set((data?.rows ?? []).map((r) => r.account))), [data]);

  // Account filter drives the summary; search only narrows the visible list.
  const accountRows = useMemo(
    () => (account === 'all' ? data?.rows ?? [] : (data?.rows ?? []).filter((r) => r.account === account)),
    [data, account]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return accountRows;
    return accountRows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.loginId.toLowerCase().includes(s) ||
        (r.houseNo ?? '').toLowerCase().includes(s) ||
        (r.sector ?? '').toLowerCase().includes(s)
    );
  }, [accountRows, q]);

  const s = useMemo(() => {
    const billed = accountRows.filter((r) => !r.arrears); // charges billed this month
    return {
      count: billed.length,
      charged: billed.reduce((t, r) => t + r.amount, 0),
      // Every rupee received this month = paid billed rows + arrears collected now.
      collected: accountRows.filter((r) => r.paid).reduce((t, r) => t + r.amount, 0),
      paidCount: billed.filter((r) => r.paid).length,
    };
  }, [accountRows]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (error) return <LoadError message={error} />;

  return (
    <div className="space-y-5">
      {/* Header + month picker */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <CalendarDays size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800">Monthly register</h2>
            <p className="text-[13px] text-slate-500">
              Every user billed in a month — package/speed, charge date, amount, payment and running balance.
            </p>
          </div>
        </div>
        <select
          value={data?.month ?? ''}
          onChange={(e) => {
            setMonth(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-700 focus:border-brand-400 focus:outline-none"
        >
          {(data?.months ?? []).map((m) => (
            <option key={m} value={m}>
              {formatDate(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Mini label="Users billed" value={String(s.count)} />
        <Mini label="Charged" value={formatPKR(s.charged)} />
        <Mini label="Collected" value={formatPKR(s.collected)} tone="text-emerald-600" />
        <Mini label="Paid" value={`${s.paidCount} / ${s.count}`} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1">
            {['all', ...accounts].map((a) => (
              <button
                key={a}
                onClick={() => {
                  setAccount(a);
                  setPage(1);
                }}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium',
                  account === a ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'
                )}
              >
                {a === 'all' ? 'All accounts' : a}
              </button>
            ))}
          </div>
          <div className="ml-auto flex min-w-[220px] flex-1 items-center gap-2">
            <Search size={15} className="text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, login ID, house or sector…"
              className="w-full bg-transparent text-[13px] focus:outline-none"
            />
          </div>
        </div>

        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Location</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Package / speed</th>
                <th className="px-4 py-2.5 font-medium">Charged</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Payment</th>
                <th className="px-5 py-2.5 text-right font-medium">Balance</th>
                {canEdit && <th className="px-4 py-2.5 text-right font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pageRows.map((r) => (
                <tr key={r.chargeId} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link to={`/customers/${r.customerId}`} className="text-[13px] font-medium text-slate-800 hover:text-brand-700">
                        {r.name}
                      </Link>
                      {r.arrears && (
                        <span className="inline-flex rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700" title={`Arrears collected this month for ${r.arrearsFor ?? 'an earlier'} bill`}>
                          Arrears{r.arrearsFor ? ` · ${r.arrearsFor}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-slate-400">{r.loginId}</div>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">{r.houseNo}, {r.sector}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-600">{r.account}</td>
                  <td className="px-4 py-3">
                    {r.package ? (
                      <span className="text-[13px] text-slate-600">
                        {r.package}
                        {r.speedMbps && !/mb/i.test(r.package) ? ` · ${r.speedMbps} MB` : ''}
                      </span>
                    ) : (
                      <PackageTag name={null} />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{formatDate(r.chargeDate)}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-semibold text-slate-800 tabular-nums">{formatPKR(r.amount)}</td>
                  <td className="px-4 py-3">
                    {r.paid ? (
                      <span className="inline-flex items-center gap-1 text-[12.5px] text-emerald-700">
                        <Check size={13} /> {formatDate(r.paidDate)}
                        <span className="text-slate-400">· {METHOD_LABEL[r.method ?? ''] ?? r.method}</span>
                      </span>
                    ) : (
                      <span className="inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Unpaid</span>
                    )}
                  </td>
                  <td className={cn('px-5 py-3 text-right text-[13px] font-semibold tabular-nums', r.balance > 0 ? 'text-red-600' : 'text-slate-400')}>
                    {formatPKR(r.balance)}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      {/* Arrears rows are a payment view, not an editable charge. */}
                      <div className={cn('flex items-center justify-end gap-1', r.arrears && 'invisible')}>
                        <button onClick={() => setEditing(r)} title="Edit" className="rounded-md p-1.5 text-slate-400 hover:bg-brand-50 hover:text-brand-600">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => del(r)} disabled={deletingId === r.chargeId} title="Delete" className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500">
                          {deletingId === r.chargeId ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">No records for this month.</div>
        ) : (
          <Pagination page={page} pages={pages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        )}
      </Card>

      {editing && (
        <EditRowModal
          row={editing}
          accounts={(accountsRef ?? []).map((a) => ({ id: a.id, name: a.name }))}
          packages={(packagesRef ?? []).filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name, speedMbps: p.speedMbps }))}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function EditRowModal({
  row,
  accounts,
  packages,
  onClose,
  onSaved,
}: {
  row: MonthlyRow;
  accounts: { id: number; name: string }[];
  packages: { id: number; name: string; speedMbps: number | null }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [chargeDate, setChargeDate] = useState(row.chargeDate);
  const [accountId, setAccountId] = useState<number | ''>(row.accountId ?? '');
  const [packageId, setPackageId] = useState<number | ''>(row.packageId ?? '');
  const [amount, setAmount] = useState(String(row.amount));
  const [paid, setPaid] = useState(row.paid);
  const [receivedAmount, setReceivedAmount] = useState(String(row.paid ? row.amount : row.amount));
  const [receivedDate, setReceivedDate] = useState(row.paidDate ?? row.chargeDate);
  const [method, setMethod] = useState(row.method ?? 'cash');
  const [balance, setBalance] = useState(String(row.balance));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateCharge(row.chargeId, {
        chargeDate,
        amount: Number(amount) || 0,
        accountId: accountId === '' ? null : Number(accountId),
        packageId: packageId === '' ? null : Number(packageId),
        paid,
        receivedAmount: paid ? Number(receivedAmount) || 0 : null,
        receivedDate: paid ? receivedDate : null,
        method: paid ? method : null,
        // Only force the balance when you actually change it; otherwise let it
        // recompute from the charges/payments above.
        balance: balance.trim() !== '' && balance !== String(row.balance) ? Number(balance) : null,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Edit — ${row.name} (${row.loginId})`}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Charge date">
            <input type="date" className={input} value={chargeDate} onChange={(e) => setChargeDate(e.target.value)} />
          </Field>
          <Field label="Amount (Rs)">
            <input inputMode="numeric" className={input} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          </Field>
          <Field label="Account (portal)">
            <select className={input} value={accountId} onChange={(e) => setAccountId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">—</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Package / speed">
            <select className={input} value={packageId} onChange={(e) => setPackageId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">— none —</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.speedMbps && !/mb/i.test(p.name) ? ` · ${p.speedMbps} MB` : ''}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-[13.5px] font-medium text-slate-700">
            <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Payment received
          </label>
          {paid && (
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              <Field label="Received (Rs)">
                <input inputMode="numeric" className={input} value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value.replace(/[^0-9]/g, ''))} />
              </Field>
              <Field label="Paid date">
                <input type="date" className={input} value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} />
              </Field>
              <Field label="Method">
                <select className={input} value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="jazz">JazzCash</option>
                  <option value="bank">Bank</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <Field label="Running balance — reconcile to your physical register">
            <div className="flex items-center gap-2">
              <input inputMode="numeric" className={cn(input, 'font-semibold')} value={balance} onChange={(e) => setBalance(e.target.value.replace(/[^0-9-]/g, ''))} />
              {balance !== String(row.balance) && (
                <button type="button" onClick={() => setBalance(String(row.balance))} className="whitespace-nowrap text-[12px] font-medium text-brand-600">
                  reset
                </button>
              )}
            </div>
          </Field>
          <p className="mt-1.5 text-[11.5px] text-slate-500">
            Sets this customer's outstanding to exactly this figure; any difference from the charges/payments above is
            parked as a hidden adjustment. Was {formatPKR(row.balance)}.
          </p>
        </div>

        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-[12px] text-slate-400">{label}</div>
      <div className={cn('mt-1 text-xl font-bold tabular-nums', tone ?? 'text-slate-800')}>{value}</div>
    </Card>
  );
}
