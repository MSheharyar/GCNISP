// GCN brand mark — the delivered globe-and-cables logo, cropped to a circle so
// the illustration's globe sits centered and the off-white corners are hidden.
// A subtle ring keeps it clean on both the dark sidebar and light surfaces.

import logoUrl from '../assets/gcn-logo.png';

interface LogoProps {
  variant?: 'light' | 'dark'; // text color context
  showWordmark?: boolean;
  size?: number;
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <img
      src={logoUrl}
      alt="GCN — Global Cable Network"
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
  return (
    <div className="flex items-center gap-2.5 select-none" title="Global Cable Network">
      <LogoMark size={size} />
      {showWordmark && (
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
      )}
    </div>
  );
}
