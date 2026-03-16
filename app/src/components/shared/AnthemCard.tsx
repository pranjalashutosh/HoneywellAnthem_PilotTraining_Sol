// T2.2 — Dark card with tertiary bg, subtle border, optional title

import type { ReactNode } from 'react';

interface AnthemCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function AnthemCard({ title, children, className = '' }: AnthemCardProps) {
  return (
    <div
      className={[
        'bg-anthem-bg-tertiary border border-anthem-border rounded-lg p-4',
        className,
      ].join(' ')}
    >
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-anthem-text-secondary mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
