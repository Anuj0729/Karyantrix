'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Small icon button that flips the whole app between light and dark mode.
 * Drop it anywhere (Navbar, mobile menu, settings page, etc.) — state is
 * shared globally via ThemeContext and persisted to localStorage.
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, mounted, toggleTheme } = useTheme();
  const isDark = mounted && theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-200/80 text-ink-500 transition-colors hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-600 ${className}`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
