import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5 ml-0.5">
                    {label}
                </label>
                <input
                    ref={ref}
                    className={`
            w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-medium)]
            rounded-xl text-white outline-none transition-all duration-200
            placeholder:text-[var(--text-muted)]
            focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-[var(--bg-surface)]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            ${className}
          `}
                    {...props}
                />
                {error && (
                    <p className="mt-1.5 text-sm text-red-400 ml-0.5 animate-fade-in">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
