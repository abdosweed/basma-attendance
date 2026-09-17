import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Ban,
  HelpCircle,
  Loader2,
  Info,
  Building2,
  Coffee,
  Calendar,
} from 'lucide-react';

export type LocationStatusType =
  | 'INSIDE_CONFIRMED'
  | 'UNCERTAIN'
  | 'OUTSIDE_CONFIRMED'
  | 'LOCATION_UNAVAILABLE'
  | 'CHECKING'
  | 'AUTHORIZED_OUTSIDE';

export type DeviceStatusType = 'APPROVED' | 'PENDING' | 'REVOKED' | 'BLOCKED' | 'NOT_FOUND';

export type GeneralStatusType =
  | 'PRESENT'
  | 'ON_TIME'
  | 'LATE'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'ON_BREAK'
  | 'CHECKED_OUT'
  | 'SUCCESS'
  | 'WARNING'
  | 'ERROR'
  | 'INFO';

export interface StatusBadgeProps {
  type?: 'location' | 'device' | 'general';
  status: LocationStatusType | DeviceStatusType | GeneralStatusType | string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  status,
  label,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
  }[size];

  // Location Badge Dispatcher
  if (type === 'location' || ['INSIDE_CONFIRMED', 'UNCERTAIN', 'OUTSIDE_CONFIRMED', 'LOCATION_UNAVAILABLE', 'CHECKING', 'AUTHORIZED_OUTSIDE'].includes(status)) {
    switch (status) {
      case 'INSIDE_CONFIRMED':
      case 'AUTHORIZED_OUTSIDE':
        return (
          <span className={`inline-flex items-center rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses} ${className}`} dir="rtl">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{label || (status === 'AUTHORIZED_OUTSIDE' ? 'خروج بإذن رسمي' : 'أنت داخل نطاق العمل')}</span>
          </span>
        );
      case 'UNCERTAIN':
        return (
          <span className={`inline-flex items-center rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${sizeClasses} ${className}`} dir="rtl">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{label || 'الموقع يحتاج لحظات للتثبيت'}</span>
          </span>
        );
      case 'OUTSIDE_CONFIRMED':
        return (
          <span className={`inline-flex items-center rounded-full font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${sizeClasses} ${className}`} dir="rtl">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{label || 'أنت خارج نطاق الفرع'}</span>
          </span>
        );
      case 'LOCATION_UNAVAILABLE':
        return (
          <span className={`inline-flex items-center rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`} dir="rtl">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{label || 'تعذر تحديد موقعك'}</span>
          </span>
        );
      case 'CHECKING':
      default:
        return (
          <span className={`inline-flex items-center rounded-full font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 ${sizeClasses} ${className}`} dir="rtl">
            <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin shrink-0" />
            <span>{label || 'جارٍ التحقق من موقعك...'}</span>
          </span>
        );
    }
  }

  // Device Badge Dispatcher
  if (type === 'device' || ['APPROVED', 'PENDING', 'REVOKED', 'BLOCKED'].includes(status)) {
    switch (status) {
      case 'APPROVED':
        return (
          <span className={`inline-flex items-center rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses} ${className}`} dir="rtl">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{label || 'جهاز موثق ومعتمد'}</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className={`inline-flex items-center rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses} ${className}`} dir="rtl">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{label || 'في انتظار اعتماد الإدارة'}</span>
          </span>
        );
      case 'REVOKED':
      case 'BLOCKED':
      default:
        return (
          <span className={`inline-flex items-center rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses} ${className}`} dir="rtl">
            <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{label || (status === 'BLOCKED' ? 'جهاز محظور' : 'ملغى الاعتماد')}</span>
          </span>
        );
    }
  }

  // General Attendance / System Status Dispatcher
  switch (status) {
    case 'PRESENT':
    case 'ON_TIME':
    case 'SUCCESS':
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses} ${className}`} dir="rtl">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{label || 'حاضر'}</span>
        </span>
      );
    case 'LATE':
    case 'WARNING':
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses} ${className}`} dir="rtl">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{label || 'متأخر'}</span>
        </span>
      );
    case 'ABSENT':
    case 'ERROR':
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses} ${className}`} dir="rtl">
          <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>{label || 'غائب'}</span>
        </span>
      );
    case 'ON_BREAK':
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-sky-50 text-sky-700 border border-sky-200 ${sizeClasses} ${className}`} dir="rtl">
          <Coffee className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>{label || 'في استراحة'}</span>
        </span>
      );
    case 'ON_LEAVE':
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses} ${className}`} dir="rtl">
          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{label || 'في إجازة'}</span>
        </span>
      );
    case 'INFO':
    default:
      return (
        <span className={`inline-flex items-center rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses} ${className}`} dir="rtl">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>{label || String(status)}</span>
        </span>
      );
  }
};
