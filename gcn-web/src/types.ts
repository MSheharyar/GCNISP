// Domain types for the GCN ISP Subscriber Management System.
// Mirrors the locked data model in the project plan.

export type ProviderType = 'reseller' | 'in_house';
export type CustomerType = 'residential' | 'commercial';
export type CustomerStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type PaymentMethod = 'cash' | 'jazz' | 'bank' | 'other';
export type UserRole = 'admin' | 'operator' | 'viewer';

// How a Connect recharge maps to payment for a given customer.
// prepaid = customer pays GCN before we recharge them → recharge settles payment.
// credit  = we may recharge on credit → recharge is only a charge; payment logged separately.
export type CollectionModel = 'prepaid' | 'credit';

// Where a charge came from.
export type ChargeSource = 'manual' | 'connect_sync';

export type PackageColor =
  | 'Yellow'
  | 'Orange'
  | 'Red'
  | 'Brown'
  | 'Purple'
  | 'Green';

export interface Provider {
  id: number;
  name: string;
  type: ProviderType;
}

export interface Account {
  id: number;
  providerId: number;
  name: string;
  notes?: string;
}

export interface Package {
  id: number;
  name: PackageColor;
  speedMbps: number;
  price: number;
  cost?: number | null; // dealer's upstream cost (cutting amount); margin = price - cost
  isActive: boolean;
}

export interface PackagePayload {
  name: string;
  speedMbps: number;
  price: number;
  cost: number | null;
  isActive: boolean;
}

export interface Subscription {
  packageId: number | null;
  frozenAmount: number | null; // overrides package standard price
  typicalChargeDay: number | null;
  isActive: boolean;
}

export interface Customer {
  id: number;
  name: string;
  loginId: string;
  type: CustomerType;
  companyName?: string | null;
  houseNo?: string;
  sector?: string;
  billingAddress?: string | null;
  currentAccountId: number; // convenience pointer, NOT history source
  currentPackageId: number | null;
  status: CustomerStatus;
  phone?: string;
  createdAt: string;
  subscription: Subscription;
  outstandingBalance: number; // derived: Σ charges − Σ payments
  monthsOverdue: number; // derived arrears depth (outstanding ÷ monthly fee)
  collectionModel: CollectionModel; // decides if a Connect recharge auto-settles payment
}

export interface Charge {
  id: number;
  customerId: number;
  accountId: number; // historical source of truth
  packageId: number | null;
  amountCharged: number;
  costAmount?: number | null; // what we paid Connect for this recharge (margin)
  chargeDate: string;
  billingPeriodLabel: string;
  source: ChargeSource;
  recordedBy: string;
  createdAt: string;
}

export interface Payment {
  id: number;
  customerId: number;
  chargeId: number | null;
  amountReceived: number;
  receivedDate: string;
  method: PaymentMethod;
  isArrears: boolean; // derived
  recordedBy: string;
  createdAt: string;
}

export interface Invoice {
  id: number;
  customerId: number;
  invoiceNo: string;
  issueDate: string;
  periodLabel: string;
  lineItems: { description: string; qty: number; unitPrice: number }[];
  totalAmount: number;
  generatedBy: string;
  createdAt: string;
}

export interface QuotationLineItem {
  description: string;
  qty: number;
  unit?: string | null; // e.g. "m" for wire per metre
  unitPrice: number;
}

export interface Quotation {
  id: number;
  type: 'quotation';
  customerId: number | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: string | null;
  quotationNo: string;
  issueDate: string;
  validUntil: string | null;
  notes: string | null;
  lineItems: QuotationLineItem[];
  totalAmount: number;
  generatedBy: string;
}

export interface QuotationPayload {
  customerId?: number | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
  validUntil?: string | null;
  notes?: string | null;
  lineItems: QuotationLineItem[];
}

export interface StaffUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastActive?: string;
}

export interface OrgSettings {
  businessName: string;
  officeContact1: string;
  officeContact2: string;
  jazzCashTitle: string;
  jazzCashNumber: string;
  connectionTech: string;
  officeAddress: string;
}

// A unified ledger line (charge = debit, payment = credit) for a customer.
export interface LedgerEntry {
  id: string;
  date: string;
  kind: 'charge' | 'payment';
  label: string;
  accountId?: number;
  packageId?: number | null;
  method?: PaymentMethod;
  debit: number;
  credit: number;
  balance: number;
  isArrears?: boolean;
  source?: ChargeSource;
  costAmount?: number | null;
}

// ── TV Cable (the "Office Book") ─────────────────────────────────────────
// A separate subscriber base, billed by House# + Sector (no login ID).
export interface CableCustomer {
  id: number;
  name?: string;
  houseNo: string;
  sector: string; // area block, e.g. 'C' | 'D' | 'F' | 'St-18'
  monthlyFee: number;
  balance: number;
  status: CustomerStatus;
  lastPaidDate?: string;
}

export interface CableEntry {
  id: string;
  cableCustomerId: number;
  date: string;
  kind: 'charge' | 'payment';
  label: string;
  debit: number;
  credit: number;
  balance: number;
  note?: string;
}

// ── Cash Book / Expenses (the "Kharcha") ─────────────────────────────────
export type ExpenseCategory =
  | 'salary'
  | 'utility'
  | 'supplies'
  | 'household'
  | 'owner_draw'
  | 'recovery'
  | 'other';

export type CashSource = 'net' | 'cable' | 'other'; // which cash box it was paid from

export interface Expense {
  id: number;
  date: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  paidFrom: CashSource;
  person?: string; // who spent / received it
  periodLabel: string;
}

// ── Connect portal sync ──────────────────────────────────────────────────
// Maps a Connect portal speed label (e.g. "15Mbps") to a GCN package.
export interface SpeedMap {
  speedLabel: string;
  packageId: number | null; // null = unmapped, imported charges land package-unset
}

export type SyncRowStatus =
  | 'imported' // matched + created a charge (and payment if prepaid)
  | 'duplicate' // already imported in a prior run, skipped
  | 'unmatched_user' // no GCN customer with this login_id
  | 'unmapped_speed'; // matched user but speed has no package mapping yet

// One recharge row scraped from the Connect "Recharge Report".
export interface SyncRow {
  id: number;
  runId: number;
  accountId: number;
  portalUserName: string;
  matchedCustomerId: number | null;
  matchedName?: string | null;
  speedLabel: string;
  costAmount: number; // portal "Amount" — what we pay Connect
  chargedAmount: number | null; // customer's GCN price applied (null if unmatched)
  paymentSettled: boolean; // true only for prepaid customers
  rechargedAt: string;
  status: SyncRowStatus;
}

// A nightly run of the Connect connector, one per Connect account.
export interface SyncRun {
  id: number;
  accountId: number;
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'partial' | 'failed';
  rowsFetched: number;
  imported: number;
  duplicates: number;
  needsAttention: number;
  errorMessage?: string | null;
}
