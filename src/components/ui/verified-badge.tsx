'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { BadgeCheck, ShieldCheck, Star, Award, Crown, Sparkles } from 'lucide-react';

/**
 * Premium verification badge system.
 *
 * Visual language:
 *  - Sapphire (verified)        — identity-verified user, blue sapphire gradient
 *  - Gold (top_rated)           — top-rated performer, gold gradient with shimmer
 *  - Emerald (trusted_partner)  — vetted call center / trusted client, emerald
 *  - Ruby (background_checked)  — background-check cleared, deep red
 *  - Onyx (elite)               — admin-granted elite tier, dark with gold ring
 *
 * Each badge renders as a self-contained pill with:
 *  - Gradient background
 *  - Subtle inner highlight (top half lighter)
 *  - Drop shadow with the badge color (creates a glow)
 *  - Optional shimmer animation (only on hover, never ambient)
 *  - Crisp SVG icon stroke (1.75–2px)
 *
 * Sizes: 'xs' (12px), 'sm' (13px), 'md' (14px), 'lg' (16px)
 *
 * Variants accept `verifiedAt` for the tooltip and `showLabel` to hide the text.
 */

export type VerificationTier =
  | 'verified'
  | 'top_rated'
  | 'trusted_partner'
  | 'background_checked'
  | 'elite';

interface TierConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  // Tailwind classes — keep all colors literal so JIT picks them up
  gradient: string;       // background gradient
  ring: string;           // outer ring / border color
  text: string;           // text color
  glow: string;           // box-shadow color (rgba)
  shimmer: string;        // shimmer overlay gradient
}

const TIER_CONFIG: Record<VerificationTier, TierConfig> = {
  verified: {
    label: 'Verified',
    icon: BadgeCheck,
    gradient: 'from-[#1e88e5] via-[#1976d2] to-[#0d47a1]',
    ring: 'ring-[#64b5f6]/40',
    text: 'text-white',
    glow: '0 1px 2px rgba(13,71,161,0.45), 0 0 0 1px rgba(100,181,246,0.25), 0 0 14px rgba(30,136,229,0.35)',
    shimmer: 'from-white/0 via-white/40 to-white/0',
  },
  top_rated: {
    label: 'Top Rated',
    icon: Star,
    gradient: 'from-[#ffd54f] via-[#ffb300] to-[#ff8f00]',
    ring: 'ring-[#ffecb3]/60',
    text: 'text-[#5d4037]',
    glow: '0 1px 2px rgba(255,143,0,0.45), 0 0 0 1px rgba(255,236,179,0.55), 0 0 16px rgba(255,179,0,0.45)',
    shimmer: 'from-white/0 via-white/60 to-white/0',
  },
  trusted_partner: {
    label: 'Trusted Partner',
    icon: ShieldCheck,
    gradient: 'from-[#10b981] via-[#059669] to-[#065f46]',
    ring: 'ring-[#6ee7b7]/50',
    text: 'text-white',
    glow: '0 1px 2px rgba(6,95,70,0.45), 0 0 0 1px rgba(110,231,183,0.35), 0 0 14px rgba(16,185,129,0.35)',
    shimmer: 'from-white/0 via-white/40 to-white/0',
  },
  background_checked: {
    label: 'Background Checked',
    icon: ShieldCheck,
    gradient: 'from-[#e53935] via-[#c62828] to-[#8e0000]',
    ring: 'ring-[#ef9a9a]/50',
    text: 'text-white',
    glow: '0 1px 2px rgba(142,0,0,0.45), 0 0 0 1px rgba(239,154,154,0.35), 0 0 14px rgba(229,57,53,0.35)',
    shimmer: 'from-white/0 via-white/40 to-white/0',
  },
  elite: {
    label: 'Elite',
    icon: Crown,
    gradient: 'from-[#212121] via-[#1a1a1a] to-[#000000]',
    ring: 'ring-[#ffd700]/60',
    text: 'text-[#ffd700]',
    glow: '0 1px 2px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,215,0,0.55), 0 0 18px rgba(255,215,0,0.45)',
    shimmer: 'from-[#ffd700]/0 via-[#ffd700]/40 to-[#ffd700]/0',
  },
};

export const VERIFICATION_TIERS = Object.keys(TIER_CONFIG) as VerificationTier[];

interface VerifiedBadgeProps {
  tier: VerificationTier;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  verifiedAt?: string | Date | null;
  // Render only the icon as a circular seal (no pill), for tighter UIs like avatars
  iconOnly?: boolean;
}

const SIZE_MAP = {
  xs: { pill: 'h-[18px] px-1.5 text-[10px] gap-0.5', icon: 'h-2.5 w-2.5', seal: 'h-4 w-4', star: 'h-2 w-2' },
  sm: { pill: 'h-[20px] px-2 text-[11px] gap-1',   icon: 'h-3 w-3',     seal: 'h-4.5 w-4.5', star: 'h-2 w-2' },
  md: { pill: 'h-[22px] px-2.5 text-[12px] gap-1', icon: 'h-3.5 w-3.5', seal: 'h-5 w-5', star: 'h-2.5 w-2.5' },
  lg: { pill: 'h-[26px] px-3 text-[13px] gap-1',   icon: 'h-4 w-4',     seal: 'h-6 w-6', star: 'h-3 w-3' },
};

export function VerifiedBadge({
  tier,
  size = 'sm',
  showLabel = true,
  className,
  verifiedAt,
  iconOnly = false,
}: VerifiedBadgeProps) {
  const cfg = TIER_CONFIG[tier];
  if (!cfg) return null;
  const Icon = cfg.icon;
  const sz = SIZE_MAP[size];

  const titleParts = [cfg.label];
  if (verifiedAt) {
    try {
      const d = typeof verifiedAt === 'string' ? new Date(verifiedAt) : verifiedAt;
      titleParts.push(`Verified on ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    } catch { /* ignore */ }
  }
  const title = titleParts.join(' · ');

  if (iconOnly) {
    // Circular seal style — sits on top of avatars
    return (
      <span
        title={title}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full bg-gradient-to-br shadow-lg ring-1.5',
          cfg.gradient,
          cfg.ring,
          cfg.text,
          sz.seal,
          className,
        )}
        style={{ boxShadow: cfg.glow }}
      >
        {/* Inner top highlight */}
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)',
          }}
        />
        <Icon className={cn('relative', sz.icon)} strokeWidth={2.25} />
      </span>
    );
  }

  return (
    <span
      title={title}
      className={cn(
        'group relative inline-flex items-center rounded-full bg-gradient-to-br font-semibold ring-1.5 whitespace-nowrap select-none',
        cfg.gradient,
        cfg.ring,
        cfg.text,
        sz.pill,
        className,
      )}
      style={{ boxShadow: cfg.glow }}
    >
      {/* Top-half inner highlight gives the badge a 3D glass feel */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 55%)',
        }}
      />
      {/* Hover-only shimmer sweep */}
      <span
        className={cn(
          'pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300',
          cfg.shimmer,
        )}
        style={{ backgroundSize: '200% 100%', animation: 'verifiedShimmer 1.4s linear infinite' }}
      />
      <Icon className={cn('relative', sz.icon)} strokeWidth={2.25} />
      {showLabel && <span className="relative tracking-tight">{cfg.label}</span>}
    </span>
  );
}

/**
 * Pick the highest-priority verification badge from a list of granted tiers.
 * Priority order (highest first): elite > top_rated > trusted_partner > background_checked > verified
 */
const PRIORITY: VerificationTier[] = ['elite', 'top_rated', 'trusted_partner', 'background_checked', 'verified'];

export function topVerificationTier(tiers: VerificationTier[] | null | undefined): VerificationTier | null {
  if (!tiers || tiers.length === 0) return null;
  for (const t of PRIORITY) {
    if (tiers.includes(t)) return t;
  }
  return tiers[0] || null;
}

/**
 * Render all granted badges as a row. Used on profile pages and admin user rows.
 */
export function VerifiedBadgeStack({
  tiers,
  size = 'sm',
  className,
}: {
  tiers: VerificationTier[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  if (!tiers || tiers.length === 0) return null;
  // Sort by priority (highest first)
  const sorted = [...tiers].sort(
    (a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b),
  );
  return (
    <span className={cn('inline-flex items-center gap-1 flex-wrap', className)}>
      {sorted.map((t) => (
        <VerifiedBadge key={t} tier={t} size={size} />
      ))}
    </span>
  );
}

// Inline shimmer keyframes — injected once per page mount.
// Using a <style> tag is fine here because Next.js renders this client component
// only once per session and the CSS is tiny.
export function VerifiedBadgeStyles() {
  return (
    <style>{`
      @keyframes verifiedShimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `}</style>
  );
}

/**
 * Gig Score ring — circular progress showing the agent's composite score (0-100).
 * Renders as a small SVG ring with the score number in the center.
 */
export function GigScoreRing({
  score,
  size = 40,
  className,
  showLabel = true,
}: {
  score: number;
  size?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(score || 0)));
  const stroke = Math.max(2, size * 0.1);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = safe / 100;
  const offset = c * (1 - pct);

  // Tier colors mirror the badge system for visual cohesion
  let color = '#9ca3af'; // gray-400 default
  if (safe >= 90) color = '#ffd700';       // gold (elite)
  else if (safe >= 75) color = '#16a34a';  // green-600
  else if (safe >= 50) color = '#3b82f6';  // blue-500
  else if (safe >= 30) color = '#f59e0b';  // amber-500
  else color = '#ef4444';                  // red-500

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={`Gig Score: ${safe}/100`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        style={{ filter: `drop-shadow(0 0 4px ${color}55)` }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <span className="relative" style={{ marginLeft: -size, width: size, height: size }}>
        <span
          className="absolute inset-0 inline-flex items-center justify-center font-bold text-gray-900"
          style={{ fontSize: size * 0.32 }}
        >
          {safe}
        </span>
      </span>
      {showLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 ml-0.5">
          Gig Score
        </span>
      )}
    </span>
  );
}
