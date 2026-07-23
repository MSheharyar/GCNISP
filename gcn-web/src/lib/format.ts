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

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
