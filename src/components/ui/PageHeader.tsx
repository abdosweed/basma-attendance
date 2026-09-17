'use client';

import React, { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/60 ${className}`}
      dir="rtl"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
