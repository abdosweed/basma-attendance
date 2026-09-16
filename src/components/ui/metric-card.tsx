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
    bg: 'bg-white dark:bg-slate-900',
    text: 'text-slate-900 dark:text-white',
    iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    border: 'border-slate-200/80 dark:border-slate-800',
  },
  emerald: {
    bg: 'bg-emerald-50/40 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
  },
  amber: {
    bg: 'bg-amber-50/40 dark:bg-amber-950/20',
    text: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
    border: 'border-amber-200/60 dark:border-amber-800/40',
  },
  rose: {
    bg: 'bg-rose-50/40 dark:bg-rose-950/20',
    text: 'text-rose-700 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400',
    border: 'border-rose-200/60 dark:border-rose-800/40',
  },
  sky: {
    bg: 'bg-sky-50/40 dark:bg-sky-950/20',
    text: 'text-sky-700 dark:text-sky-400',
    iconBg: 'bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400',
    border: 'border-sky-200/60 dark:border-sky-800/40',
  },
  purple: {
    bg: 'bg-purple-50/40 dark:bg-purple-950/20',
    text: 'text-purple-700 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    border: 'border-purple-200/60 dark:border-purple-800/40',
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
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
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
          <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
        ) : (
          <div className={`text-2xl font-extrabold tracking-tight ${styles.text}`}>
            {value}
          </div>
        )}
      </div>

      {(subtitle || changeTrend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {changeTrend && (
            <span
              className={`font-semibold flex items-center gap-1 ${
                changeTrend.direction === 'up'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : changeTrend.direction === 'down'
                  ? 'text-rose-600 dark:text-rose-400'
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
