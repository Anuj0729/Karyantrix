'use client';

import { useEffect, useRef } from 'react';

export default function OtpBoxInput({ length = 6, value = '', onChange, autoFocus = true, disabled = false }) {
  const inputsRef = useRef([]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const setDigit = (index, char) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join(''));
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setDigit(index, '');
      return;
    }
    const chars = raw.split('');
    let cursor = index;
    const next = digits.slice();
    chars.forEach((ch) => {
      if (cursor < length) {
        next[cursor] = ch;
        cursor += 1;
      }
    });
    onChange(next.join(''));
    const focusIndex = Math.min(cursor, length - 1);
    requestAnimationFrame(() => inputsRef.current[focusIndex]?.focus());
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        setDigit(index, '');
      } else if (index > 0) {
        setDigit(index - 1, '');
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!raw) return;
    onChange(raw);
    const focusIndex = Math.min(raw.length, length - 1);
    requestAnimationFrame(() => inputsRef.current[focusIndex]?.focus());
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputsRef.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          aria-label={`OTP digit ${index + 1}`}
          className="h-12 w-11 rounded-xl border border-ink-200 text-center text-lg font-semibold text-ink-900 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50 sm:h-14 sm:w-12"
        />
      ))}
    </div>
  );
}
