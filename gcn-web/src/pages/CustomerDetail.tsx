import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Zap,
  ArrowRightLeft,
  FileText,
  Phone,
  MapPin,
  Building2,
  Pencil,
  Wallet,
  HandCoins,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { api, lookup } from '../services/api';
import { useApi } from '../lib/useApi';
import { formatPKR, formatDate, initials } from '../lib/format';
import {
  Card,
  CardHeader,
  PackageTag,
  StatusBadge,
  AccountChip,
  MethodBadge,
  Avatar,
  Button,
  OverdueBadge,
  Modal,
  LoadError,
  Pagination,
  cn,
} from '../components/ui/primitives';

export default function CustomerDetail() {
  const { id } = useParams();
  const cid = Number(id);
  const [reload, setReload] = useState(0);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(1);
  const { data: customer, loading, error } = useApi(() => api.customer(cid), [cid, reload]);
  const { data: ledger } = useApi(() => api.customerLedger(cid), [cid, reload]);
  const { data: accounts } = useApi(() => api.accounts(), []);
  const { data: packages } = useApi(() => api.packages(), []);

  // Latest entries first; running balance stays chronological.
  const LEDGER_PAGE_SIZE = 12;
  const ledgerRows = useMemo(() => (ledger ? [...ledger].reverse() : []), [ledger]);
  const ledgerPages = Math.max(1, Math.ceil(ledgerRows.length / LEDGER_PAGE_SIZE));
  const pagedLedger = ledgerRows.slice((ledgerPage - 1) * LEDGER_PAGE_SIZE, ledgerPage * LEDGER_PAGE_SIZE);

  if (error) return <LoadError message={error} />;
  if (loading || !customer) {
    return <div className="h-96 animate-pulse rounded-xl bg-slate-200/70" />;
  }

  const account = lookup.account(customer.currentAccountId);
  const provider = lookup.accountProvider(customer.currentAccountId);
  const pkg = lookup.package(customer.currentPackageId);
  const price = customer.subscription.frozenAmount ?? pkg?.price ?? 0;

  return (
    <div className="space-y-5">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft size={15} /> Back to customers
      </Link>

      {customer.monthsOverdue >= 2 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle size={20} className="shrink-0 text-red-500" />
          <div className="flex-1 text-[13px] text-red-800">
            <b>Overdue {customer.monthsOverdue} months.</b> This customer has carried a balance for {customer.monthsOverdue}{' '}
            consecutive months ({formatPKR(customer.outstandingBalance)} owed) — follow up for recovery.
          </div>
          <Link to={`/log?customer=${customer.id}&collect=1`}>
            <Button variant="danger" size="sm">
              <Zap size={14} /> Collect now
            </Button>
          </Link>
        </div>
      )}

      {/* Header card */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar label={initials(customer.name)} className="h-14 w-14 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {customer.type === 'commercial' && <Building2 size={16} className="text-slate-400" />}
              <h2 className="text-xl font-semibold text-slate-800">{customer.name}</h2>
              <StatusBadge status={customer.status} />
            </div>
            {customer.companyName && <p className="text-sm text-slate-500">{customer.companyName}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
              <span className="font-mono text-slate-600">{customer.loginId}</span>
              {customer.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={13} /> {customer.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {customer.houseNo}, {customer.sector}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to={`/log?customer=${customer.id}`}>
              <Button variant="primary">
                <Zap size={15} /> Log Charge + Payment
              </Button>
            </Link>
            <Button onClick={() => setSwitchOpen(true)}>
              <ArrowRightLeft size={15} /> Switch account
            </Button>
            {customer.type === 'commercial' && (
              <Link to="/invoices">
                <Button>
                  <FileText size={15} /> Invoice
                </Button>
              </Link>
            )}
            <Link to={`/customers/${customer.id}/edit`}>
              <Button variant="ghost">
                <Pencil size={15} /> Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* quick facts */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <Fact label="Account">
            <AccountChip name={account?.name ?? '—'} inHouse={provider?.type === 'in_house'} />
          </Fact>
          <Fact label="Package">
            <PackageTag name={pkg?.name} />
          </Fact>
          <Fact label="Monthly amount">
            <span className="font-semibold text-slate-800">{formatPKR(price)}</span>
            {customer.subscription.frozenAmount && (
              <span className="ml-1 rounded bg-violet-50 px-1 py-0.5 text-[10px] font-medium text-violet-600">frozen</span>
            )}
          </Fact>
          <Fact label="Outstanding balance">
            <div className="flex items-center gap-2">
              <span className={cn('text-base font-bold', customer.outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600')}>
                {customer.outstandingBalance > 0 ? formatPKR(customer.outstandingBalance) : 'Clear'}
              </span>
              <OverdueBadge months={customer.monthsOverdue} />
            </div>
          </Fact>
        </div>

        {/* Collection model — how this customer usually pays (a synced recharge is always
            charge-only; you confirm the payment on Charged Today once cash / JazzCash arrives) */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600">
          {customer.collectionModel === 'prepaid' ? (
            <>
              <Wallet size={14} className="text-emerald-600" />
              <b className="text-slate-700">Prepaid</b> — usually pays before the recharge. Confirm each recharge on Charged Today.
            </>
          ) : (
            <>
              <HandCoins size={14} className="text-amber-600" />
              <b className="text-slate-700">Credit</b> — pays after the recharge. Confirm each recharge on Charged Today.
            </>
          )}
        </div>
      </Card>

      {/* Ledger */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Running ledger"
          subtitle="Charges debit, payments credit — unpaid dues carry forward. Each line remembers its account."
        />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Description</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 text-right font-medium">Charge</th>
                <th className="px-4 py-2.5 text-right font-medium">Paid</th>
                <th className="px-5 py-2.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pagedLedger.map((e) => (
                <tr key={e.id} className={cn('hover:bg-slate-50', e.isArrears && 'bg-orange-50/40')}>
                  <td className="whitespace-nowrap px-5 py-3 text-[13px] text-slate-600">{formatDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-slate-700">{e.label}</span>
                      {e.method && <MethodBadge method={e.method} />}
                      {e.source === 'connect_sync' && (
                        <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700" title="Auto-imported from the Connect portal">
                          <RefreshCw size={9} /> AUTO
                        </span>
                      )}
                      {e.costAmount != null && (
                        <span className="text-[11px] text-slate-400">cost {formatPKR(e.costAmount)}</span>
                      )}
                      {e.isArrears && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                          ARREARS
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {e.accountId ? (
                      <AccountChip
                        name={lookup.account(e.accountId)?.name ?? '—'}
                        inHouse={lookup.accountProvider(e.accountId)?.type === 'in_house'}
                      />
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] text-slate-600">
                    {e.debit ? formatPKR(e.debit) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] font-medium text-emerald-600">
                    {e.credit ? formatPKR(e.credit) : '—'}
                  </td>
                  <td className={cn('px-5 py-3 text-right text-[13px] font-semibold', e.balance > 0 ? 'text-red-600' : 'text-slate-500')}>
                    {formatPKR(e.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ledger && ledger.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">No ledger activity yet.</div>
        )}
        {ledgerRows.length > LEDGER_PAGE_SIZE && (
          <Pagination
            page={ledgerPage}
            pages={ledgerPages}
            total={ledgerRows.length}
            onChange={setLedgerPage}
          />
        )}
      </Card>

      <SwitchAccountModal
        open={switchOpen}
        onClose={() => setSwitchOpen(false)}
        customer={customer}
        accounts={accounts ?? []}
        packages={packages ?? []}
        onDone={() => {
          setSwitchOpen(false);
          setReload((r) => r + 1);
        }}
      />
    </div>
  );
}

function SwitchAccountModal({
  open,
  onClose,
  customer,
  accounts,
  packages,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  customer: { id: number; currentAccountId: number; currentPackageId: number | null };
  accounts: { id: number; name: string; providerId: number }[];
  packages: { id: number; name: string; isActive: boolean }[];
  onDone: () => void;
}) {
  const [accountId, setAccountId] = useState(customer.currentAccountId);
  const [packageId, setPackageId] = useState<number | ''>(customer.currentPackageId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.switchAccount(customer.id, accountId, packageId === '' ? null : Number(packageId));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Switch account">
      <div className="space-y-3">
        <p className="text-[13px] text-slate-500">
          Moves this customer to another provider account. Past charges keep their original account.
        </p>
        <label className="block text-[12.5px] font-medium text-slate-600">Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {lookup.provider(a.providerId)?.name}
            </option>
          ))}
        </select>
        <label className="block text-[12.5px] font-medium text-slate-600">Package (optional)</label>
        <select
          value={packageId}
          onChange={(e) => setPackageId(e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Keep current</option>
          {packages.filter((p) => p.isActive).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Switching…' : 'Switch account'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11.5px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
