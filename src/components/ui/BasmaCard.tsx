import React from 'react';

export interface BasmaCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'standard' | 'interactive' | 'highlighted' | 'warning' | 'danger';
}

const variantClasses = {
  standard: 'bg-white border-slate-200/80 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]',
  interactive: 'bg-white border-slate-200/80 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-md cursor-pointer active:scale-[0.99]',
  highlighted: 'bg-sky-50/40 border-sky-200/80 shadow-sm',
  warning: 'bg-amber-50/40 border-amber-200/80 shadow-sm',
  danger: 'bg-rose-50/40 border-rose-200/80 shadow-sm',
};

export const BasmaCard: React.FC<BasmaCardProps> = ({
  children,
  className = '',
  onClick,
  variant = 'standard',
}) => {
  const selectedVariant = onClick ? 'interactive' : variant;

  return (
    <div
      onClick={onClick}
      className={`border rounded-2xl p-5 transition-all duration-200 ${variantClasses[selectedVariant]} ${className}`}
    >
      {children}
    </div>
  );
};
