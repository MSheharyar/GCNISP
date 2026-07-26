export function formatPKR(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}Rs ${Math.abs(Math.round(amount)).toLocaleString('en-PK')}`;
}

export function formatDate(iso?: string | null): string {
  // Accepts YYYY-MM-DD or YYYY-MM
  if (!iso) return '—';
  const parts = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const y = parts[0];
  const m = months[Number(parts[1]) - 1] ?? '';
  const d = parts[2];
  return d ? `${d} ${m} ${y}` : `${m} ${y}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-07" → "July 2026", with the current month labelled "This month". */
export function monthLabel(key: string): string {
  if (key === new Date().toISOString().slice(0, 7)) return 'This month';
  const [y, m] = key.split('-');
  const idx = Number(m) - 1;
  return `${MONTHS[idx] ?? m} ${y}`;
}

/** Group items into month buckets (newest month first) by an ISO-date accessor. */
export function groupByMonth<T>(items: T[], dateOf: (t: T) => string): { key: string; label: string; items: T[] }[] {
  const buckets = new Map<string, T[]>();
  for (const it of items) {
    const k = monthKey(dateOf(it));
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(it);
  }
  return [...buckets.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ key, label: monthLabel(key), items: buckets.get(key)! }));
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
