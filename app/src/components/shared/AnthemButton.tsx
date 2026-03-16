// T2.1 — Anthem-themed button with 44x44px min touch target

import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'success' | 'warning' | 'danger';

interface AnthemButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  active?: boolean;
  compact?: boolean;
}

const variantStyles: Record<ButtonVariant, { border: string; text: string; glow: string }> = {
  primary: {
    border: 'border-anthem-cyan',
    text: 'text-anthem-cyan',
    glow: 'shadow-[0_0_12px_var(--anthem-cyan-glow)]',
  },
  success: {
    border: 'border-anthem-green',
    text: 'text-anthem-green',
    glow: 'shadow-[0_0_12px_rgba(34,197,94,0.15)]',
  },
  warning: {
    border: 'border-anthem-amber',
    text: 'text-anthem-amber',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]',
  },
  danger: {
    border: 'border-anthem-red',
    text: 'text-anthem-red',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.15)]',
  },
};

export function AnthemButton({
  variant = 'primary',
  active = false,
  compact = false,
  className = '',
  children,
  disabled,
  ...props
}: AnthemButtonProps) {
  const v = variantStyles[variant];
  const height = compact ? 'min-h-[36px]' : 'min-h-[44px] min-w-[44px]';

  return (
    <button
      className={[
        'inline-flex items-center justify-center px-4 py-2 rounded border',
        'bg-anthem-bg-tertiary font-sans text-sm font-medium',
        'transition-all duration-150 select-none',
        'active:scale-[0.97]',
        height,
        v.border,
        v.text,
        active && v.glow,
        active && 'bg-anthem-bg-secondary',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
