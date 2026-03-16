// T2.3 — Dark input, monospace for data fields, sans-serif for labels

import type { InputHTMLAttributes } from 'react';

interface AnthemInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  mono?: boolean;
}

export function AnthemInput({
  label,
  mono = false,
  className = '',
  ...props
}: AnthemInputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-anthem-text-secondary font-sans">
          {label}
        </label>
      )}
      <input
        className={[
          'min-h-[44px] px-3 py-2 rounded border border-anthem-border',
          'bg-anthem-bg-input text-anthem-text-primary text-sm',
          'placeholder:text-anthem-text-muted',
          'focus:outline-none focus:border-anthem-cyan',
          'transition-colors duration-150',
          mono ? 'font-mono' : 'font-sans',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  );
}
