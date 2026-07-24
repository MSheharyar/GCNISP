// GCN brand mark — the delivered globe-and-cables logo, cropped to a circle so
// the illustration's globe sits centered and the off-white corners are hidden.
// A subtle ring keeps it clean on both the dark sidebar and light surfaces.

import { useSyncExternalStore } from 'react';
import logoUrl from '../assets/gcn-logo.png';
import { dealerLogo, dealerName, onBrandingChange } from '../lib/branding';

interface LogoProps {
  variant?: 'light' | 'dark'; // text color context
  showWordmark?: boolean;
  size?: number;
}

// Re-render whenever the dealer's branding changes (set at login/bootstrap).
function useDealerLogo(): string | null {
  return useSyncExternalStore(onBrandingChange, dealerLogo, () => null);
}
function useDealerName(): string | null {
  return useSyncExternalStore(onBrandingChange, dealerName, () => null);
}

export function LogoMark({ size = 36 }: { size?: number }) {
  const custom = useDealerLogo();
  return (
    <img
      src={custom ?? logoUrl}
      alt="Logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover shadow-sm ring-1 ring-black/10"
    />
  );
}

export default function Logo({ variant = 'dark', showWordmark = true, size = 36 }: LogoProps) {
  const primary = variant === 'dark' ? '#ffffff' : '#0f1725';
  const secondary = variant === 'dark' ? 'rgba(255,255,255,0.55)' : '#6b7280';
  const name = useDealerName();
  return (
    <div className="flex items-center gap-2.5 select-none" title={name ?? 'Global Cable Network'}>
      <LogoMark size={size} />
      {showWordmark &&
        (name ? (
          // White-label dealer: their business name as the wordmark.
          <div
            style={{ color: primary }}
            className="max-w-[150px] truncate text-[15px] font-semibold leading-tight tracking-tight"
          >
            {name}
          </div>
        ) : (
          <div className="leading-none">
            <div
              style={{ color: primary, fontFamily: 'Georgia, "Times New Roman", serif' }}
              className="text-[15px] font-semibold tracking-[0.14em]"
            >
              GLOBAL
            </div>
            <div
              style={{ color: secondary, fontFamily: 'Georgia, "Times New Roman", serif' }}
              className="text-[10.5px] font-medium tracking-[0.22em]"
            >
              CABLE NETWORK
            </div>
          </div>
        ))}
    </div>
  );
}
