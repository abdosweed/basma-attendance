/**
 * Reporting UI Formatters & Helpers - Basma Attendance System v1.14.0
 * Phase 12B.1 Core Reporting Engine
 */

import { ReportingStatus, ReportFlag } from './types';

export function getStatusBadgeStyle(status: ReportingStatus): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'PRESENT':
    case 'ON_TIME':
      return {
        label: 'حاضر (في الوقت)',
        bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
      };
    case 'LATE':
      return {
        label: 'متأخر',
        bgClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
        textClass: 'text-amber-700 dark:text-amber-400',
        borderClass: 'border-amber-200 dark:border-amber-800',
      };
    case 'ABSENT':
      return {
        label: 'غائب',
        bgClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
        textClass: 'text-rose-700 dark:text-rose-400',
        borderClass: 'border-rose-200 dark:border-rose-800',
      };
    case 'ON_LEAVE':
      return {
        label: 'في إجازة',
        bgClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
        textClass: 'text-blue-700 dark:text-blue-400',
        borderClass: 'border-blue-200 dark:border-blue-800',
      };
    case 'NOT_SCHEDULED':
      return {
        label: 'غير مجدول',
        bgClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        textClass: 'text-slate-600 dark:text-slate-400',
        borderClass: 'border-slate-200 dark:border-slate-700',
      };
    case 'INCOMPLETE_ATTENDANCE':
      return {
        label: 'بصمة غير مكتملة',
        bgClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
        textClass: 'text-purple-700 dark:text-purple-400',
        borderClass: 'border-purple-200 dark:border-purple-800',
      };
    case 'WORK_HOURS_DEFICIT':
      return {
        label: 'عجز ساعات عمل',
        bgClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
        textClass: 'text-orange-700 dark:text-orange-400',
        borderClass: 'border-orange-200 dark:border-orange-800',
      };
    case 'HOLIDAY':
      return {
        label: 'عطلة رسمية',
        bgClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
        textClass: 'text-teal-700 dark:text-teal-400',
        borderClass: 'border-teal-200 dark:border-teal-800',
      };
    default:
      return {
        label: status,
        bgClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        textClass: 'text-slate-700 dark:text-slate-300',
        borderClass: 'border-slate-200 dark:border-slate-700',
      };
  }
}

export function getFlagBadgeStyle(flag: ReportFlag): { label: string; classNames: string } {
  switch (flag) {
    case 'LATE':
      return { label: 'تأخير', classNames: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'ABSENT':
      return { label: 'غياب', classNames: 'bg-rose-100 text-rose-800 border-rose-300' };
    case 'EARLY_LEAVE':
      return { label: 'خروج مبكر', classNames: 'bg-orange-100 text-orange-800 border-orange-300' };
    case 'MISSING_CHECKOUT':
      return { label: 'بدون انصراف', classNames: 'bg-purple-100 text-purple-800 border-purple-300' };
    case 'BREAK_EXCEEDED':
      return { label: 'تجاوز استراحة', classNames: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    case 'GPS_VERIFIED':
      return { label: 'تأكيد إداري', classNames: 'bg-sky-100 text-sky-800 border-sky-300' };
    case 'ADMIN_ADJUSTED':
      return { label: 'معدل إدارياً', classNames: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    case 'WORK_HOURS_DEFICIT':
      return { label: 'عجز ساعات', classNames: 'bg-red-100 text-red-800 border-red-300' };
    case 'OUTSIDE_ATTEMPT':
      return { label: 'خارج النطاق', classNames: 'bg-pink-100 text-pink-800 border-pink-300' };
    default:
      return { label: flag, classNames: 'bg-slate-100 text-slate-800 border-slate-300' };
  }
}
