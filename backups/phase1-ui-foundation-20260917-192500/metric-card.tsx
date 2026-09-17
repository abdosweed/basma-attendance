'use client';

import React, { ReactNode } from 'react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  subtitle?: string;
  changeTrend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  variant?: 'default' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
  loading?: boolean;
  className?: string;
}

const variantStyles: Record<string, { bg: string; text: string; iconBg: string; border: string }> = {
  default: {
    bg: 'bg-white',
    text: 'text-slate-900',
    iconBg: 'bg-slate-100 text-slate-700',
    border: 'border-slate-200/80',
  },
  emerald: {
    bg: 'bg-emerald-50/50',
    text: 'text-emerald-800',
    iconBg: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200/80',
  },
  amber: {
    bg: 'bg-amber-50/50',
    text: 'text-amber-800',
    iconBg: 'bg-amber-100 text-amber-700',
    border: 'border-amber-200/80',
  },
  rose: {
    bg: 'bg-rose-50/50',
    text: 'text-rose-800',
    iconBg: 'bg-rose-100 text-rose-700',
    border: 'border-rose-200/80',
  },
  sky: {
    bg: 'bg-sky-50/50',
    text: 'text-sky-800',
    iconBg: 'bg-sky-100 text-sky-700',
    border: 'border-sky-200/80',
  },
  purple: {
    bg: 'bg-purple-50/50',
    text: 'text-purple-800',
    iconBg: 'bg-purple-100 text-purple-700',
    border: 'border-purple-200/80',
  },
};

export function MetricCard({
  title,
  value,
  icon,
  subtitle,
  changeTrend,
  variant = 'default',
  loading = false,
  className = '',
}: MetricCardProps) {
  const styles = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={`relative p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${styles.bg} ${styles.border} ${className}`}
      dir="rtl"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs font-semibold text-slate-600 truncate">
          {title}
        </span>
        {icon && (
          <div className={`p-2 rounded-xl text-lg flex items-center justify-center shrink-0 ${styles.iconBg}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-1">
        {loading ? (
          <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />
        ) : (
          <div className={`text-2xl font-extrabold tracking-tight ${styles.text}`}>
            {value}
          </div>
        )}
      </div>

      {(subtitle || changeTrend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {changeTrend && (
            <span
              className={`font-semibold flex items-center gap-1 ${
                changeTrend.direction === 'up'
                  ? 'text-emerald-700'
                  : changeTrend.direction === 'down'
                  ? 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              <span>{changeTrend.direction === 'up' ? '▲' : changeTrend.direction === 'down' ? '▼' : '•'}</span>
              <span>{changeTrend.value}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
