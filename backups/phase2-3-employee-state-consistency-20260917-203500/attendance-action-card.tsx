'use client';

import React from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Clock, Coffee, Fingerprint, CheckCircle2, LogOut } from 'lucide-react';
import { formatWesternTime, formatWesternDuration, toWesternNumerals } from '@/lib/number-formatter';

export interface AttendanceActionCardProps {
  checkInAt?: string | null;
  checkOutAt?: string | null;
  totalWorkedMinutes?: number | null;
  activeBreak?: any | null;
  shiftName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  branchName?: string;
  locationStatusMessage?: string;
  locationStatusType?: 'info' | 'error' | 'success';
  isOutsideGeofence?: boolean;
  actionLoading?: boolean;
  onCheckIn?: () => void;
  onCheckOut?: () => void;
  onBreakStart?: () => void;
  onBreakEnd?: () => void;
  onRequestCorrection?: () => void;
}

export function AttendanceActionCard({
  checkInAt,
  checkOutAt,
  totalWorkedMinutes,
  activeBreak,
  shiftName = 'الوردية العادية',
  scheduledStart = '08:00',
  scheduledEnd = '16:00',
  branchName = 'الفرع الرئيسي',
  locationStatusMessage = 'الموقع الجغرافي مؤكد ومطابق للفرع 📍',
  locationStatusType = 'info',
  isOutsideGeofence = false,
  actionLoading = false,
  onCheckIn,
  onCheckOut,
  onBreakStart,
  onBreakEnd,
  onRequestCorrection,
}: AttendanceActionCardProps) {
  // Determine State
  const isCheckedIn = Boolean(checkInAt);
  const isCheckedOut = Boolean(checkOutAt);
  const isOnBreak = Boolean(activeBreak);

  let currentStatus: 'PRESENT' | 'ON_BREAK' | 'CHECKED_OUT' | 'ABSENT' = 'ABSENT';
  let statusArabicLabel = 'لم تسجل حضورك بعد';
  let heroTitle = 'لم تسجل حضورك بعد';

  const formattedShiftStart = formatWesternTime(scheduledStart);
  const formattedShiftEnd = formatWesternTime(scheduledEnd);
  let heroSubtitle = `وردية اليوم: ${shiftName} (${formattedShiftStart} - ${formattedShiftEnd})`;

  // Calculate worked duration if not directly provided but check-in and check-out exist
  let calculatedDurationMinutes = totalWorkedMinutes;
  if ((calculatedDurationMinutes === null || calculatedDurationMinutes === undefined) && checkInAt && checkOutAt) {
    try {
      const inTime = new Date(checkInAt).getTime();
      const outTime = new Date(checkOutAt).getTime();
      if (!isNaN(inTime) && !isNaN(outTime) && outTime > inTime) {
        calculatedDurationMinutes = Math.floor((outTime - inTime) / (1000 * 60));
      }
    } catch (e) {}
  }

  const formattedCheckIn = formatWesternTime(checkInAt);
  const formattedCheckOut = formatWesternTime(checkOutAt);
  const formattedDuration = formatWesternDuration(calculatedDurationMinutes);

  if (isCheckedOut) {
    currentStatus = 'CHECKED_OUT';
    statusArabicLabel = 'انتهى الدوام';
    heroTitle = 'انتهى دوامك اليوم';
    heroSubtitle = 'شكراً لالتزامك وتفانيك!';
  } else if (isOnBreak) {
    currentStatus = 'ON_BREAK';
    statusArabicLabel = 'في استراحة';
    heroTitle = 'أنت في استراحة حالياً ☕';
    heroSubtitle = activeBreak?.startTime
      ? `بدأت الاستراحة الساعة ${formatWesternTime(activeBreak.startTime)}`
      : 'يمكنك إنهاء الاستراحة والعودة للدوام عند الاستعداد.';
  } else if (isCheckedIn) {
    currentStatus = 'PRESENT';
    statusArabicLabel = 'في الدوام';
    heroTitle = 'أنت في الدوام الآن 🟢';
    heroSubtitle = `سجلت الحضور الساعة ${formattedCheckIn} • ${branchName}`;
  }

  // State D: COMPLETED DAY (Calm, single completed hero without GPS prompts or duplicated pills)
  if (isCheckedOut) {
    return (
      <div className="w-full max-w-lg mx-auto space-y-3" dir="rtl">
        <div className="p-5 bg-white border border-slate-200/80 rounded-3xl shadow-xs text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">{heroTitle}</h2>
            <p className="text-xs text-slate-500">{heroSubtitle}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] text-slate-500 font-medium block">وقت الدخول</span>
              <span className="font-bold text-slate-900 dir-ltr inline-block">{formattedCheckIn}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] text-slate-500 font-medium block">وقت الانصراف</span>
              <span className="font-bold text-slate-900 dir-ltr inline-block">{formattedCheckOut}</span>
            </div>
            {formattedDuration !== '—' && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 font-medium block">مدة العمل</span>
                <span className="font-bold text-emerald-700 dir-ltr inline-block">{formattedDuration}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active / Pending Attendance View
  return (
    <div className="w-full max-w-lg mx-auto space-y-3" dir="rtl">
      {/* Top Location Status Bar */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-white border border-slate-200/80 rounded-2xl shadow-xs text-xs">
        <div className="flex items-center gap-2 truncate">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              locationStatusType === 'success'
                ? 'bg-emerald-500 animate-pulse'
                : locationStatusType === 'error'
                ? 'bg-rose-500'
                : 'bg-sky-500'
            }`}
          />
          <span className="text-slate-700 truncate font-medium text-[11px]">
            {toWesternNumerals(locationStatusMessage)}
          </span>
        </div>
        <div className="shrink-0">
          <StatusBadge status={currentStatus} label={statusArabicLabel} size="sm" />
        </div>
      </div>

      {/* Main Attendance Action Hero */}
      <div className="relative p-5 bg-white border border-slate-200/80 rounded-3xl shadow-xs text-center space-y-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-slate-900">{heroTitle}</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{heroSubtitle}</p>
        </div>

        {/* Primary Action Button Area */}
        <div className="py-1 flex flex-col items-center justify-center">
          {/* State A: Not Checked In */}
          {!isCheckedIn && (
            <button
              onClick={onCheckIn}
              disabled={actionLoading || isOutsideGeofence}
              className="relative group w-40 h-40 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping pointer-events-none" />
              <Fingerprint className="w-9 h-9 text-white" />
              <span className="text-sm font-extrabold tracking-wide">تسجيل الحضور</span>
              <span className="text-[10px] opacity-90">ربط الموقع والجهاز</span>
            </button>
          )}

          {/* State B: Working */}
          {isCheckedIn && !isOnBreak && (
            <div className="w-full space-y-2.5">
              <Button
                variant="danger"
                size="md"
                fullWidth
                isLoading={actionLoading}
                onClick={onCheckOut}
                leftIcon={<LogOut className="w-4 h-4" />}
                className="text-xs font-bold min-h-[44px]"
              >
                تسجيل الانصراف
              </Button>

              {onBreakStart && (
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  isLoading={actionLoading}
                  onClick={onBreakStart}
                  leftIcon={<Coffee className="w-3.5 h-3.5" />}
                  className="text-xs font-medium"
                >
                  بدء استراحة مدفوعة
                </Button>
              )}
            </div>
          )}

          {/* State C: On Break */}
          {isOnBreak && (
            <Button
              variant="primary"
              size="md"
              fullWidth
              isLoading={actionLoading}
              onClick={onBreakEnd}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              className="bg-sky-600 hover:bg-sky-700 text-white shadow-xs font-bold text-xs min-h-[44px]"
            >
              إنهاء الاستراحة والعودة للعمل
            </Button>
          )}
        </div>

        {/* Correction Exception Link */}
        {onRequestCorrection && (
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={onRequestCorrection}
              className="text-[11px] font-semibold text-slate-500 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 transition-colors"
            >
              <span>تعذر تسجيل البصمة؟ تقديم طلب تصحيح</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
