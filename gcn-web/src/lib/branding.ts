import type { Branding } from '../services/api';

// The default GCN ramp lives in index.css. When a dealer sets a primary colour
// we derive the full 50→900 ramp from that single hex and override the CSS
// variables at runtime; the logo URL is stored for the Logo component to read.

const RAMP: Record<number, { mix: 'white' | 'black'; amt: number }> = {
  50: { mix: 'white', amt: 0.92 },
  100: { mix: 'white', amt: 0.84 },
  200: { mix: 'white', amt: 0.72 },
  300: { mix: 'white', amt: 0.55 },
  400: { mix: 'white', amt: 0.33 },
  500: { mix: 'white', amt: 0.15 },
  600: { mix: 'white', amt: 0 }, // base
  700: { mix: 'black', amt: 0.12 },
  800: { mix: 'black', amt: 0.24 },
  900: { mix: 'black', amt: 0.38 },
};

let currentLogo: string | null = null;
let currentName: string | null = null;
const listeners = new Set<() => void>();

export function dealerLogo(): string | null {
  return currentLogo;
}

/** Dealer business name for the wordmark (null = default GCN wordmark). */
export function dealerName(): string | null {
  return currentName;
}

export function onBrandingChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function mix(base: [number, number, number], toward: 'white' | 'black', amt: number): [number, number, number] {
  const target = toward === 'white' ? 255 : 0;
  return base.map((c) => c + (target - c) * amt) as [number, number, number];
}

/** Apply a dealer's branding (or reset to defaults when null). */
export function applyBranding(b: Branding | null): void {
  const root = document.documentElement;

  const rgb = b?.primaryColor ? hexToRgb(b.primaryColor) : null;
  if (rgb) {
    for (const [step, { mix: dir, amt }] of Object.entries(RAMP)) {
      root.style.setProperty(`--color-brand-${step}`, toHex(mix(rgb, dir, amt)));
    }
  } else {
    // Reset any previously applied overrides so we fall back to index.css.
    for (const step of Object.keys(RAMP)) {
      root.style.removeProperty(`--color-brand-${step}`);
    }
  }

  currentLogo = b?.logoUrl ?? null;
  // A dealer counts as "white-label" once they've customised anything (logo or
  // colour) — then we show their name as the wordmark. GCN (no customisation)
  // keeps the default serif GLOBAL / CABLE NETWORK mark.
  const customized = Boolean(b?.logoUrl || b?.primaryColor);
  currentName = customized && b?.name ? b.name : null;
  listeners.forEach((fn) => fn());

  if (b?.name) document.title = b.name;
}
