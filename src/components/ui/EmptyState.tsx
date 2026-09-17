'use client';

import React, { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'لا توجد نتائج مطابقة',
  description = 'جرّب تغيير خيارات البحث أو إزالة بعض الفلاتر.',
  icon = <Inbox className="w-10 h-10 text-slate-400" />,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 text-center bg-white border border-slate-200/80 rounded-2xl flex flex-col items-center justify-center space-y-3 ${className}`}
      dir="rtl"
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="font-bold text-sm text-slate-800">{title}</h4>
        {description && <p className="text-xs text-slate-500 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
