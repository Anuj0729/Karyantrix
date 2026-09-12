'use client';

import { motion } from 'framer-motion';
import Spinner from './Spinner';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-card hover:from-brand-700 hover:to-brand-800 hover:shadow-glow-brand focus-visible:ring-brand-500 disabled:from-ink-200 disabled:to-ink-200 disabled:text-ink-400',
  accent:
    'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-card hover:from-accent-600 hover:to-accent-700 hover:shadow-glow-accent focus-visible:ring-accent-400 disabled:from-ink-200 disabled:to-ink-200 disabled:text-ink-400',
  secondary:
    'bg-white text-ink-800 border border-ink-200 shadow-soft hover:bg-ink-50 hover:border-ink-300 hover:text-ink-900 focus-visible:ring-brand-400 disabled:border-ink-100 disabled:text-ink-300 disabled:bg-ink-50',
  ghost:
    'bg-transparent text-ink-700 hover:bg-ink-100/80 hover:text-ink-900 focus-visible:ring-ink-300 disabled:text-ink-300',
  danger:
    'bg-red-50 text-red-600 border border-red-200/80 hover:bg-red-600 hover:text-white hover:border-red-600 focus-visible:ring-red-400 disabled:bg-ink-50 disabled:border-ink-100 disabled:text-ink-300',
  gold:
    'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-card hover:from-gold-600 hover:to-gold-700 focus-visible:ring-gold-400 disabled:from-ink-200 disabled:to-ink-200 disabled:text-ink-400',
  outline:
    'bg-transparent text-brand-600 border border-brand-300 hover:bg-brand-50 hover:border-brand-500 focus-visible:ring-brand-400 disabled:border-ink-200 disabled:text-ink-300',
};

const SIZES = {
  xs: 'px-2.5 py-1 text-xs gap-1.5',
  sm: 'px-3.5 py-1.5 text-xs font-medium gap-1.5',
  md: 'px-4 py-2.5 text-sm font-semibold gap-2',
  lg: 'px-6 py-3 text-base font-semibold gap-2.5',
  xl: 'px-7 py-3.5 text-lg font-bold gap-3',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon = null,
  fullWidth = false,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      whileHover={isDisabled ? undefined : { y: -1.5 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center select-none rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:shadow-none ${
        VARIANTS[variant] || VARIANTS.primary
      } ${SIZES[size] || SIZES.md} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner
          size={size === 'xs' || size === 'sm' ? 14 : 18}
          className={
            variant === 'primary' || variant === 'accent' || variant === 'gold'
              ? 'text-white'
              : 'text-brand-600'
          }
        />
      ) : (
        icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
      )}
      {children}
    </motion.button>
  );
}
