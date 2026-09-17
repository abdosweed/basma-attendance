'use client';

import React from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Coffee, Fingerprint, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

export interface AttendanceActionCardProps {
  checkInAt?: string | null;
  checkOutAt?: string | null;
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
  // Determine Attendance State
  const isCheckedIn = Boolean(checkInAt);
  const isCheckedOut = Boolean(checkOutAt);
  const isOnBreak = Boolean(activeBreak);

  let currentStatus: 'PRESENT' | 'ON_BREAK' | 'CHECKED_OUT' | 'ABSENT' = 'ABSENT';
  let heroTitle = 'لم تسجل حضورك بعد';
  let heroSubtitle = `وردية اليوم: ${shiftName} (${scheduledStart} - ${scheduledEnd})`;

  if (isCheckedOut) {
    currentStatus = 'CHECKED_OUT';
    heroTitle = 'انتهى دوامك اليوم 🎉';
    heroSubtitle = 'شكراً لالتزامك! تم تسجيل الانصراف وإكمال ساعات العمل بنجاح.';
  } else if (isOnBreak) {
    currentStatus = 'ON_BREAK';
    heroTitle = 'أنت في استراحة حالياً';
    heroSubtitle = activeBreak?.startTime
      ? `بدأت الاستراحة الساعة ${activeBreak.startTime}`
      : 'يمكنك إنهاء الاستراحة والعودة للدوام في أي وقت.';
  } else if (isCheckedIn) {
    currentStatus = 'PRESENT';
    heroTitle = 'أنت في الدوام الآن 🟢';
    heroSubtitle = `سجلت الحضور الساعة ${checkInAt} • ${branchName}`;
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-4" dir="rtl">
      {/* Top Location Status Bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-white border border-slate-200/80 rounded-2xl shadow-sm text-xs">
        <div className="flex items-center gap-2 truncate">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              locationStatusType === 'success'
                ? 'bg-emerald-500 animate-pulse'
                : locationStatusType === 'error'
                ? 'bg-rose-500'
                : 'bg-sky-500'
            }`}
          />
          <span className="text-slate-700 truncate font-medium">
            {locationStatusMessage}
          </span>
        </div>
        <div className="shrink-0">
          <StatusBadge status={currentStatus} size="sm" />
        </div>
      </div>

      {/* Main Biometric Status & Action Hero */}
      <div className="relative p-6 bg-white border border-slate-200/80 rounded-3xl shadow-sm text-center space-y-5">
        {/* Dynamic Hero Title & Subtitle */}
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">{heroTitle}</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{heroSubtitle}</p>
        </div>

        {/* Primary Biometric Action Buttons */}
        <div className="py-2 flex flex-col items-center justify-center">
          {/* State A: Not Checked In */}
          {!isCheckedIn && !isCheckedOut && (
            <button
              onClick={onCheckIn}
              disabled={actionLoading || isOutsideGeofence}
              className="relative group w-44 h-44 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping pointer-events-none" />
              <Fingerprint className="w-10 h-10 text-white" />
              <span className="text-base font-extrabold tracking-wide">تسجيل الحضور</span>
              <span className="text-[11px] opacity-90">اضغط لربط الموقع والجهاز</span>
            </button>
          )}

          {/* State B: Working (Checked In & Not on Break) */}
          {isCheckedIn && !isCheckedOut && !isOnBreak && (
            <div className="w-full space-y-3">
              <Button
                variant="danger"
                size="lg"
                fullWidth
                isLoading={actionLoading}
                onClick={onCheckOut}
                leftIcon={<LogOut className="w-5 h-5" />}
                className="text-sm font-bold min-h-[48px]"
              >
                تسجيل الانصراف
              </Button>

              {onBreakStart && (
                <Button
                  variant="secondary"
                  size="md"
                  fullWidth
                  isLoading={actionLoading}
                  onClick={onBreakStart}
                  leftIcon={<Coffee className="w-4 h-4" />}
                  className="text-xs font-semibold"
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
              size="lg"
              fullWidth
              isLoading={actionLoading}
              onClick={onBreakEnd}
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
              className="bg-sky-600 hover:bg-sky-700 text-white shadow-md font-bold text-sm min-h-[48px]"
            >
              إنهاء الاستراحة والعودة للعمل
            </Button>
          )}

          {/* State D: Completed */}
          {isCheckedOut && (
            <div className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <div className="text-sm font-bold text-emerald-900">
                تم تسجيل الانصراف بنجاح
              </div>
              <div className="text-xs text-emerald-700">
                نتمنى لك بقية يوم سعيدة!
              </div>
            </div>
          )}
        </div>

        {/* Exception Workflow: Correction Link */}
        {onRequestCorrection && !isCheckedOut && (
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={onRequestCorrection}
              className="text-xs font-semibold text-slate-500 hover:text-emerald-700 hover:underline inline-flex items-center gap-1 transition-colors"
            >
              <span>تعذر تسجيل البصمة؟ تقديم طلب تصحيح</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
