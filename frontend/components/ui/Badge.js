const TONES = {
  neutral: 'bg-ink-100 text-ink-700 border-ink-200/60',
  brand: 'bg-brand-50 text-brand-700 border-brand-200/60',
  accent: 'bg-accent-50 text-accent-700 border-accent-200/60',
  success: 'bg-trust-50 text-trust-700 border-trust-200/60',
  trust: 'bg-trust-50 text-trust-700 border-trust-200/60',
  warning: 'bg-gold-50 text-gold-700 border-gold-200/60',
  danger: 'bg-red-50 text-red-700 border-red-200/60',
  gold: 'bg-gold-50 text-gold-800 border-gold-300/80 font-semibold',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
};

const DOT_COLORS = {
  neutral: 'bg-ink-400',
  brand: 'bg-brand-500',
  accent: 'bg-accent-500',
  success: 'bg-trust-500',
  trust: 'bg-trust-500',
  warning: 'bg-gold-500',
  danger: 'bg-red-500',
  gold: 'bg-gold-500',
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
};

const SIZES = {
  sm: 'px-2 py-0.5 text-[11px] font-medium',
  md: 'px-2.5 py-1 text-xs font-medium',
  lg: 'px-3 py-1.5 text-xs font-semibold',
};

export default function Badge({
  children,
  tone = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  icon = null,
}) {
  const toneStyle = TONES[tone] || TONES.neutral;
  const dotColor = DOT_COLORS[tone] || DOT_COLORS.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${toneStyle} ${
        SIZES[size] || SIZES.md
      } ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColor}`} />}
      {icon}
      {children}
    </span>
  );
}
