// ── API service layer (real backend) ────────────────────────────────────
// Talks to the Laravel API. Auth token is kept in localStorage and sent as a
// Bearer header. Reference data (accounts/providers/packages) is cached once
// after login so the synchronous `lookup` helper below stays instant.

import type {
  Account,
  CableCustomer,
  CableEntry,
  Customer,
  Expense,
  LedgerEntry,
  Package,
  PackagePayload,
  Provider,
  Quotation,
  QuotationPayload,
  SpeedMap,
  StaffUser,
  Invoice,
  OrgSettings,
  SyncRow,
  SyncRun,
} from '../types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api';
const TOKEN_KEY = 'gcn_token';

// ── Write payload shapes ────────────────────────────────────────────────
export interface LogChargePayload {
  accountId?: number | null;
  packageId?: number | null;
  chargeAmount?: number; // omit for payment-only (collect arrears)
  chargeDate?: string;
  billingPeriodLabel?: string;
  logPayment: boolean;
  receivedAmount?: number;
  receivedDate?: string;
  method?: string;
}

export interface StaffPayload {
  name?: string;
  email?: string;
  role?: 'admin' | 'operator' | 'viewer';
  isActive?: boolean;
  password?: string;
}

export interface CustomerPayload {
  name: string;
  loginId: string;
  type: 'residential' | 'commercial';
  companyName?: string | null;
  houseNo?: string;
  sector?: string;
  billingAddress?: string | null;
  currentAccountId: number;
  currentPackageId?: number | null;
  status: string;
  phone?: string;
  collectionModel: 'prepaid' | 'credit';
  frozenAmount?: number | null;
  typicalChargeDay?: number | null;
}

export interface ExpensePayload {
  date: string;
  amount: number;
  category: string;
  description: string;
  paidFrom: string;
  person?: string | null;
}

export interface CablePayload {
  name?: string | null;
  houseNo: string;
  sector: string;
  monthlyFee: number;
  balance?: number;
}

export interface ChargedTodayRow {
  id: number;
  customerId: number;
  loginId: string;
  name: string;
  houseNo: string;
  sector: string;
  account: string;
  chargeDate: string;
  time: string | null;
  packageId: number | null;
  package: string | null;
  speedMbps: number | null;
  portalSpeed: string | null; // the speed the portal reported for this recharge
  amount: number;
  previousBalance: number | null;
  source: string;
  pending: boolean; // staged portal recharge awaiting "Add to record"
}

export interface MonthlyRow {
  chargeId: number;
  customerId: number;
  loginId: string;
  name: string;
  houseNo: string;
  sector: string;
  account: string;
  package: string | null;
  speedMbps: number | null;
  chargeDate: string;
  amount: number;
  paid: boolean;
  paidDate: string | null;
  method: string | null;
  balance: number;
}

export interface MonthlyData {
  months: string[];
  month: string;
  rows: MonthlyRow[];
  summary: { count: number; charged: number; collected: number; paidCount: number };
}

export interface PortalStat {
  accountId: number;
  account: string;
  source: string;
  total: number | null;
  active: number | null;
  online: number | null;
  offline: number | null;
  disabled: number | null;
  inactive: number | null;
  expired: number | null;
  expiring: number | null;
  newUsers: number | null;
  balance: number | null;
  topupReceived: number | null;
  topupSend: number | null;
  packages: { speed: string; online: number; active: number }[] | null;
  error: string | null;
  capturedAt: string | null;
}

export interface PortalAccount {
  id: number;
  name: string;
  provider: string | null;
  source: 'connect' | 'fiberbeam' | null;
  username: string | null;
  dealer: string | null; // fiberbeam dealer slug
  enabled: boolean;
  hasPassword: boolean;
}

export interface PortalAccountPayload {
  source: 'connect' | 'fiberbeam' | null;
  username: string | null;
  password?: string | null; // only sent when changing it
  dealer: string | null;
  enabled: boolean;
}

export interface CommitChargeResult {
  chargeId: number;
  pending: boolean;
  amount: number;
  previousBalance: number;
  newBalance: number;
  packageId: number | null;
  package: string | null;
  speedMbps: number | null;
}

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

async function req<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (res.status === 401) {
    auth.clear();
    if (!location.pathname.startsWith('/login')) location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// Fetch a PDF as a blob (Bearer auth — a plain <a> can't send the header) and
// open it in a new tab.
async function openPdf(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
  });
  if (!res.ok) throw new Error(`Failed to load PDF (${res.status})`);
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── Reference cache (for synchronous lookups) ───────────────────────────
const refCache: { accounts: Account[]; providers: Provider[]; packages: Package[] } = {
  accounts: [],
  providers: [],
  packages: [],
};

export async function bootstrapRefData(): Promise<void> {
  const [accounts, providers, packages] = await Promise.all([
    req<Account[]>('/accounts'),
    req<Provider[]>('/providers'),
    req<Package[]>('/packages'),
  ]);
  refCache.accounts = accounts;
  refCache.providers = providers;
  refCache.packages = packages;
}

// ── Auth ────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  isActive: boolean;
  isSuperAdmin?: boolean;
}

export interface Dealer {
  id: number;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial';
  contactName: string | null;
  contactPhone: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  users: number;
  customers: number;
  createdAt: string | null;
  admin?: { id: number; name: string; email: string };
}

export interface Branding {
  name: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
}

export interface LeadPayload {
  name: string;
  businessName?: string;
  phone: string;
  city?: string;
  subscribers?: string;
  portals?: string;
  message?: string;
}

export interface Lead {
  id: number;
  name: string;
  businessName: string | null;
  phone: string;
  city: string | null;
  subscribers: string | null;
  portals: string | null;
  message: string | null;
  status: 'new' | 'contacted' | 'converted' | 'dropped';
  createdAt: string | null;
}

export interface DealerCreatePayload {
  name: string;
  slug?: string;
  contactName?: string;
  contactPhone?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { token, user } = await req<{ token: string; user: AuthUser }>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  auth.set(token);
  await bootstrapRefData();
  return user;
}

export async function logout(): Promise<void> {
  try {
    await req('/logout', { method: 'POST' });
  } catch {
    /* ignore */
  }
  auth.clear();
}

export function me(): Promise<AuthUser> {
  return req<AuthUser>('/me');
}

// ── Data API (same surface the screens already use) ─────────────────────
export const api = {
  providers: () => req<Provider[]>('/providers'),
  accounts: () => req<Account[]>('/accounts'),
  packages: () => req<Package[]>('/packages'),
  staff: () => req<StaffUser[]>('/staff'),
  createStaff: (payload: StaffPayload) => req<StaffUser>('/staff', { method: 'POST', body: JSON.stringify(payload) }),
  updateStaff: (id: number, payload: StaffPayload) =>
    req<StaffUser>(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStaff: (id: number) => req<{ deleted: boolean }>(`/staff/${id}`, { method: 'DELETE' }),
  invoices: () => req<Invoice[]>('/invoices'),
  orgSettings: () => req<OrgSettings>('/org-settings'),
  speedMap: () => req<SpeedMap[]>('/speed-map'),
  connectSync: () => req<{ runs: SyncRun[]; rows: SyncRow[] }>('/connect-sync'),
  runSync: () => req<{ runs: SyncRun[]; rows: SyncRow[] }>('/connect-sync/run', { method: 'POST' }),
  portalStats: () => req<PortalStat[]>('/portal-stats'),
  refreshPortalStats: () => req<PortalStat[]>('/portal-stats/refresh', { method: 'POST' }),
  portalAccounts: () => req<PortalAccount[]>('/portal-accounts'),
  updatePortalAccount: (id: number, payload: PortalAccountPayload) =>
    req<PortalAccount>(`/portal-accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  createPackage: (payload: PackagePayload) =>
    req<Package>('/packages', { method: 'POST', body: JSON.stringify(payload) }),
  updatePackage: (id: number, payload: PackagePayload) =>
    req<Package>(`/packages/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  // ── SaaS owner console (super-admin only) ───────────────────────────────
  dealers: () => req<Dealer[]>('/admin/dealers'),
  createDealer: (payload: DealerCreatePayload) =>
    req<Dealer>('/admin/dealers', { method: 'POST', body: JSON.stringify(payload) }),
  updateDealer: (
    id: number,
    payload: Partial<{ name: string; status: string; contactName: string; contactPhone: string; slug: string; primaryColor: string | null; logoUrl: string | null }>
  ) => req<Dealer>(`/admin/dealers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  branding: () => req<Branding>('/branding'),
  leads: () => req<Lead[]>('/admin/leads'),
  updateLead: (id: number, status: Lead['status']) =>
    req<Lead>(`/admin/leads/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  // Public — landing page "Request access" form (no auth).
  submitLead: (payload: LeadPayload) =>
    req<{ ok: boolean }>('/public/leads', { method: 'POST', body: JSON.stringify(payload) }),

  customers: () => req<Customer[]>('/customers'),
  customer: (id: number) => req<Customer>(`/customers/${id}`),
  customerLedger: (id: number) => req<LedgerEntry[]>(`/customers/${id}/ledger`),
  recovery: () => req<Customer[]>('/recovery'),

  dashboard: () =>
    req<{
      latestMonth: string;
      collectedThisMonth: number;
      collectedToday: number;
      totalOutstanding: number;
      byStatus: Record<string, number>;
      perAccount: { account: Account; collected: number; customers: number }[];
      unsetPackage: number;
      overdueCount: number;
      recovery: Customer[];
      methodBreakdown: { method: string; amount: number }[];
      trend: { month: string; amount: number }[];
      totalCustomers: number;
      activeSubscribers: number;
      subscriberBase: number;
      portalActive: number;
    }>('/dashboard'),

  chargedToday: () => req<ChargedTodayRow[]>('/charged-today'),
  monthly: (month?: string) => req<MonthlyData>(`/monthly${month ? `?month=${month}` : ''}`),
  markChargePaid: (chargeId: number, paid: boolean, method?: string) =>
    req<{ chargeId: number; paid: boolean; paidMethod: string | null }>(`/charges/${chargeId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paid, method }),
    }),
  // Confirm a staged portal recharge into the ledger (opening balance + amount + package).
  commitCharge: (chargeId: number, openingBalance: number, amount: number, packageId?: number | null) =>
    req<CommitChargeResult>(`/charges/${chargeId}/commit`, {
      method: 'POST',
      body: JSON.stringify({ openingBalance, amount, packageId }),
    }),

  cableCustomers: () => req<CableCustomer[]>('/cable-customers'),
  cableCustomer: (id: number) => req<CableCustomer>(`/cable-customers/${id}`),
  cableLedger: (id: number) => req<CableEntry[]>(`/cable-customers/${id}/ledger`),

  expenses: () => req<Expense[]>('/expenses'),

  // ── Writes ────────────────────────────────────────────────────────────
  logChargePayment: (customerId: number, payload: LogChargePayload) =>
    req<{ customer: Customer }>(`/customers/${customerId}/log`, { method: 'POST', body: JSON.stringify(payload) }),
  createCustomer: (payload: CustomerPayload) =>
    req<Customer>('/customers', { method: 'POST', body: JSON.stringify(payload) }),
  updateCustomer: (id: number, payload: CustomerPayload) =>
    req<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  switchAccount: (id: number, accountId: number, packageId?: number | null) =>
    req<Customer>(`/customers/${id}/switch-account`, { method: 'POST', body: JSON.stringify({ accountId, packageId }) }),
  createExpense: (payload: ExpensePayload) =>
    req<Expense>('/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  createCableCustomer: (payload: CablePayload) =>
    req<CableCustomer>('/cable-customers', { method: 'POST', body: JSON.stringify(payload) }),
  logCablePayment: (id: number, payload: { amount: number; date: string; label?: string }) =>
    req<CableCustomer>(`/cable-customers/${id}/payment`, { method: 'POST', body: JSON.stringify(payload) }),

  generateInvoice: (payload: { customerId: number; periodLabel: string }) =>
    req<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  // Fetch the PDF as a blob (Bearer auth) and open it in a new tab.
  openInvoicePdf: (id: number) => openPdf(`/invoices/${id}/pdf`),

  quotations: () => req<Quotation[]>('/quotations'),
  generateQuotation: (payload: QuotationPayload) =>
    req<Quotation>('/quotations', { method: 'POST', body: JSON.stringify(payload) }),
  openQuotationPdf: (id: number) => openPdf(`/quotations/${id}/pdf`),
  cashbook: () =>
    req<{
      perMonth: { month: string; netIncome: number; cableIncome: number; connectCost: number; spend: number; profit: number }[];
      byCategory: Record<string, number>;
      byPerson: Record<string, number>;
      totalSpend: number;
      latestMonth: string;
    }>('/cashbook'),
};

// ── Synchronous lookups (served from the ref cache) ─────────────────────
export const lookup = {
  account: (id?: number) => refCache.accounts.find((a) => a.id === id),
  provider: (id?: number) => refCache.providers.find((p) => p.id === id),
  package: (id?: number | null) => refCache.packages.find((p) => p.id === id),
  accountProvider: (accountId?: number) => {
    const acc = refCache.accounts.find((a) => a.id === accountId);
    return refCache.providers.find((p) => p.id === acc?.providerId);
  },
};
