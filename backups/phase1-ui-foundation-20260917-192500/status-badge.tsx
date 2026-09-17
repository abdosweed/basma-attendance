'use client';

import React from 'react';
import { ReportingStatus, ReportFlag } from '@/lib/reporting/types';

export type StatusBadgeType = ReportingStatus | ReportFlag | 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

export interface StatusBadgeProps {
  status: StatusBadgeType;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface StatusStyle {
  defaultLabel: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  isPulsing?: boolean;
}

const statusStyleMap: Record<string, StatusStyle> = {
  // 1. PRESENT / ON_TIME (Emerald)
  PRESENT: {
    defaultLabel: 'حاضر',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    dotClass: 'bg-emerald-500',
    isPulsing: true,
  },
  ON_TIME: {
    defaultLabel: 'حاضر (في الوقت)',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  // 2. LATE (Amber)
  LATE: {
    defaultLabel: 'متأخر',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    dotClass: 'bg-amber-500',
  },
  // 3. ABSENT (Rose/Red)
  ABSENT: {
    defaultLabel: 'غائب',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-700',
    borderClass: 'border-rose-200',
    dotClass: 'bg-rose-500',
  },
  // 4. ON_LEAVE (Blue/Indigo)
  ON_LEAVE: {
    defaultLabel: 'في إجازة',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    dotClass: 'bg-blue-500',
  },
  // 5. NOT_SCHEDULED (Slate)
  NOT_SCHEDULED: {
    defaultLabel: 'غير مجدول',
    bgClass: 'bg-slate-100',
    textClass: 'text-slate-600',
    borderClass: 'border-slate-200',
    dotClass: 'bg-slate-400',
  },
  // 6. INCOMPLETE_ATTENDANCE / MISSING_CHECKOUT (Purple/Orange)
  INCOMPLETE_ATTENDANCE: {
    defaultLabel: 'غير مكتمل',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    dotClass: 'bg-purple-500',
    isPulsing: true,
  },
  MISSING_CHECKOUT: {
    defaultLabel: 'بدون انصراف',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    dotClass: 'bg-purple-500',
  },
  // 7. ON_BREAK (Sky)
  ON_BREAK: {
    defaultLabel: 'في استراحة',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200',
    dotClass: 'bg-sky-500',
    isPulsing: true,
  },
  CHECKED_OUT: {
    defaultLabel: 'منصرف',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200',
    dotClass: 'bg-indigo-500',
  },
  // 8. WORK_HOURS_DEFICIT (Orange)
  WORK_HOURS_DEFICIT: {
    defaultLabel: 'عجز ساعات',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200',
    dotClass: 'bg-orange-500',
  },
  // 9. ADMIN_ADJUSTED (Indigo/Purple)
  ADMIN_ADJUSTED: {
    defaultLabel: 'معدل إدارياً',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-700',
    borderClass: 'border-violet-200',
    dotClass: 'bg-violet-500',
  },
  BREAK_EXCEEDED: {
    defaultLabel: 'تجاوز استراحة',
    bgClass: 'bg-yellow-50',
    textClass: 'text-yellow-800',
    borderClass: 'border-yellow-200',
    dotClass: 'bg-yellow-500',
  },
  GPS_VERIFIED: {
    defaultLabel: 'تأكيد إداري',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200',
    dotClass: 'bg-teal-500',
  },
  HOLIDAY: {
    defaultLabel: 'عطلة رسمية',
    bgClass: 'bg-teal-50',
    textClass: 'text-teal-700',
    borderClass: 'border-teal-200',
    dotClass: 'bg-teal-500',
  },
};

const defaultStyle: StatusStyle = {
  defaultLabel: 'عام',
  bgClass: 'bg-slate-100',
  textClass: 'text-slate-700',
  borderClass: 'border-slate-200',
  dotClass: 'bg-slate-500',
};

export function StatusBadge({
  status,
  label,
  showDot = true,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  const style = statusStyleMap[status] || defaultStyle;
  const displayLabel = label || style.defaultLabel;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size];

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border transition-all ${style.bgClass} ${style.textClass} ${style.borderClass} ${sizeClasses} ${className}`}
      dir="rtl"
    >
      {showDot && (
        <span className="relative flex items-center justify-center">
          {style.isPulsing && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${style.dotClass}`}
            />
          )}
          <span className={`relative inline-flex rounded-full ${dotSizes} ${style.dotClass}`} />
        </span>
      )}
      <span>{displayLabel}</span>
    </span>
  );
}
