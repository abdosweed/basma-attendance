'use client';

import React, { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses = {
  primary:
    'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 dark:bg-emerald-500 dark:hover:bg-emerald-600',
  secondary:
    'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900',
  outline:
    'border border-slate-300 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
  ghost:
    'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20 dark:bg-rose-500 dark:hover:bg-rose-600',
  success:
    'bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-600/20 dark:bg-teal-500 dark:hover:bg-teal-600',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5 min-h-[34px]',
  md: 'px-4 py-2 text-xs font-semibold rounded-xl gap-2 min-h-[40px]',
  lg: 'px-6 py-3 text-sm font-semibold rounded-2xl gap-2.5 min-h-[48px]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const isButtonDisabled = disabled || isLoading;

  return (
    <button
      disabled={isButtonDisabled}
      className={`inline-flex items-center justify-center font-medium transition-all duration-150 select-none active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100 ${
        variantClasses[variant]
      } ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      dir="rtl"
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>جاري التحميل...</span>
        </>
      ) : (
        <>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          <span>{children}</span>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        </>
      )}
    </button>
  );
}
