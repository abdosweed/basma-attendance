import React from 'react';

export type LocationStatusType =
  | 'INSIDE_CONFIRMED'
  | 'UNCERTAIN'
  | 'OUTSIDE_CONFIRMED'
  | 'LOCATION_UNAVAILABLE'
  | 'CHECKING'
  | 'AUTHORIZED_OUTSIDE';

export type DeviceStatusType = 'APPROVED' | 'PENDING' | 'REVOKED' | 'BLOCKED' | 'NOT_FOUND';

interface StatusBadgeProps {
  type: 'location' | 'device';
  status: LocationStatusType | DeviceStatusType | string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, className = '' }) => {
  if (type === 'location') {
    switch (status) {
      case 'INSIDE_CONFIRMED':
      case 'AUTHORIZED_OUTSIDE':
        return (
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${className}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>أنت داخل نطاق العمل</span>
          </div>
        );
      case 'UNCERTAIN':
        return (
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 ${className}`}>
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <span>الموقع يحتاج لحظات إضافية للتثبيت</span>
          </div>
        );
      case 'OUTSIDE_CONFIRMED':
        return (
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 ${className}`}>
            <span className="h-2 w-2 rounded-full bg-rose-500"></span>
            <span>أنت خارج نطاق الفرع</span>
          </div>
        );
      case 'LOCATION_UNAVAILABLE':
        return (
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            <span>تعذر تحديد موقعك</span>
          </div>
        );
      case 'CHECKING':
      default:
        return (
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 ${className}`}>
            <span className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></span>
            <span>جارٍ التحقق من موقعك...</span>
          </div>
        );
    }
  }

  // Device status badge
  switch (status) {
    case 'APPROVED':
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>جهاز موثق ومعتمد</span>
        </div>
      );
    case 'PENDING':
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
          <svg className="w-3.5 h-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>جهازك في انتظار اعتماد الإدارة</span>
        </div>
      );
    case 'REVOKED':
    case 'BLOCKED':
    default:
      return (
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span>تم إلغاء اعتماد الجهاز</span>
        </div>
      );
  }
};
