import React from 'react';

interface BasmaCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const BasmaCard: React.FC<BasmaCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] transition-all duration-200 ${
        onClick ? 'cursor-pointer active:scale-[0.99] hover:border-slate-300' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
