'use client';

import React from 'react';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';

export interface AttendanceActionCardProps {
  checkInAt?: string | null;
  checkOutAt?: string | null;
  activeBreak?: any | null;
  shiftName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
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
  shiftName = 'الوردية الصباحية',
  scheduledStart = '08:00',
  scheduledEnd = '16:00',
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
  // Determine state
  const isCheckedIn = Boolean(checkInAt);
  const isCheckedOut = Boolean(checkOutAt);
  const isOnBreak = Boolean(activeBreak);

  // Status mapping
  let currentStatus: 'PRESENT' | 'ON_BREAK' | 'CHECKED_OUT' | 'ABSENT' | 'INCOMPLETE_ATTENDANCE' = 'ABSENT';
  if (isCheckedOut) {
    currentStatus = 'CHECKED_OUT';
  } else if (isOnBreak) {
    currentStatus = 'ON_BREAK';
  } else if (isCheckedIn) {
    currentStatus = 'PRESENT';
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-5" dir="rtl">
      {/* Top Location & Shift Status Pill */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm text-xs">
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
          <span className="text-slate-600 dark:text-slate-300 truncate font-medium">
            {locationStatusMessage}
          </span>
        </div>
        <div className="shrink-0">
          <StatusBadge status={currentStatus} size="sm" />
        </div>
      </div>

      {/* Central Pulsing Biometric Action Area */}
      <div className="relative p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm text-center space-y-6">
        {/* Shift Time Badge */}
        <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200">
          <span>⏰ {shiftName}:</span>
          <span dir="ltr" className="font-mono font-semibold text-slate-900 dark:text-white">
            {scheduledStart} - {scheduledEnd}
          </span>
        </div>

        {/* Action Buttons Render */}
        <div className="py-2 flex flex-col items-center justify-center">
          {!isCheckedIn && !isCheckedOut && (
            <button
              onClick={onCheckIn}
              disabled={actionLoading}
              className="relative group w-44 h-44 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all duration-200 disabled:opacity-50"
            >
              <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
              <span className="text-4xl">👇</span>
              <span className="text-base font-extrabold tracking-wide">تسجيل الدخول</span>
              <span className="text-[11px] opacity-90">اضغط لربط الموقع والجهاز</span>
            </button>
          )}

          {isCheckedIn && !isCheckedOut && !isOnBreak && (
            <div className="w-full space-y-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={actionLoading}
                onClick={onBreakStart}
                className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 shadow-sky-600/20 text-base"
              >
                ☕ بدء استراحة مدفوعة
              </Button>

              <Button
                variant="danger"
                size="lg"
                fullWidth
                isLoading={actionLoading}
                onClick={onCheckOut}
                className="text-base"
              >
                👋 تسجيل الانصراف
              </Button>
            </div>
          )}

          {isOnBreak && (
            <button
              onClick={onBreakEnd}
              disabled={actionLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-md font-bold text-base flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <span>🔄 إنهاء الاستراحة والعودة للعمل</span>
            </button>
          )}

          {isCheckedOut && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-1">
              <div className="text-2xl">🎉</div>
              <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                تم إكمال دوام اليوم بنجاح
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                شكراً لالتزامك! نتمنى لك يوماً سعيداً.
              </div>
            </div>
          )}
        </div>

        {/* Correction Fallback Link */}
        {onRequestCorrection && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={onRequestCorrection}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>✏️ تعذر تسجيل البصمة؟ تقديم طلب تصحيح حضور</span>
            </button>
          </div>
        )}
      </div>

      {/* Today's Quick Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          title="وقت الدخول الفعلي"
          value={checkInAt || 'لم يتم التسجيل'}
          variant={checkInAt ? 'emerald' : 'default'}
          subtitle={checkInAt ? 'تم التأكيد الجغرافي' : 'بانتظار البصمة'}
        />
        <MetricCard
          title="وقت الانصراف الفعلي"
          value={checkOutAt || (isCheckedIn ? 'في العمل الآن' : 'لم يتم التسجيل')}
          variant={checkOutAt ? 'emerald' : isCheckedIn ? 'sky' : 'default'}
          subtitle={checkOutAt ? 'منصرف' : isCheckedIn ? 'دوام قائم' : '—'}
        />
      </div>
    </div>
  );
}
