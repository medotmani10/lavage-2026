import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  action?: ReactNode;
  noPadding?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', title, description, action, noPadding, glow, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`animate-fade-in bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] ${className.includes('overflow-') ? '' : 'overflow-hidden'} ${glow ? 'shadow-[var(--shadow-glow-orange)] border-primary-500/30' : 'shadow-[var(--shadow-card)]'
        } ${className}`}
    >
      {(title || description || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-white">{title}</h3>
            )}
            {description && (
              <p className="text-sm mt-0.5 text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
    </div>
  );
}
