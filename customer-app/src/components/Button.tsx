import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className = '', variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {

        const variants = {
            primary: 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20 border border-transparent',
            secondary: 'bg-[var(--bg-panel)] hover:bg-[var(--border-heavy)] text-white border border-[var(--border-medium)]',
            outline: 'bg-transparent hover:bg-primary-500/10 text-primary-400 border border-primary-500/30',
            ghost: 'bg-transparent hover:bg-white/5 text-[var(--text-secondary)] hover:text-white',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm rounded-lg',
            md: 'px-5 py-2.5 text-base rounded-xl font-medium',
            lg: 'px-6 py-3.5 text-lg rounded-xl font-bold w-full',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`
          relative flex items-center justify-center gap-2 transition-all duration-200
          active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]
          disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100
          ${variants[variant]}
          ${sizes[size]}
          ${className}
        `}
                {...props}
            >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {!isLoading && children}
            </button>
        );
    }
);

Button.displayName = 'Button';
