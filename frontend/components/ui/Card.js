'use client';

import { motion } from 'framer-motion';

export default function Card({
  children,
  className = '',
  hover = true,
  glass = false,
  interactive = false,
  as: Component = motion.div,
  whileHover: customWhileHover,
  whileTap: customWhileTap,
  ...props
}) {
  const baseSurface = glass
    ? 'glass-card'
    : 'bg-white border border-ink-200/80 shadow-soft';

  const hoverEffects = hover
    ? 'transition-all duration-200 hover:shadow-card-hover hover:border-brand-300'
    : '';

  const interactiveClasses = interactive ? 'cursor-pointer select-none' : '';

  const whileHover = customWhileHover !== undefined
    ? customWhileHover
    : hover
    ? { y: -3 }
    : undefined;

  const whileTap = customWhileTap !== undefined
    ? customWhileTap
    : interactive
    ? { scale: 0.99 }
    : undefined;

  return (
    <Component
      whileHover={whileHover}
      whileTap={whileTap}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl ${baseSurface} ${hoverEffects} ${interactiveClasses} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
