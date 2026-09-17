import React, { useState, useEffect } from 'react';
import { BasmaCard } from './BasmaCard';
import { StatusBadge, LocationStatusType, DeviceStatusType } from './StatusBadge';
import { MasterActionButton, ActionType } from './MasterActionButton';

interface EmployeeHeroCardProps {
  locationStatus: LocationStatusType;
  deviceStatus: DeviceStatusType;
  branchName: string;
  shiftName: string;
  actionType: ActionType;
  onAction: () => void;
  isLoading?: boolean;
  actionDisabled?: boolean;
  disabledReason?: string;
  showSuccessMoment?: boolean;
  successTime?: string;
  onRetryLocation?: () => void;
  onRequestManagerVerification?: () => void;
}

import { formatWesternTime } from '@/lib/number-formatter';

export const EmployeeHeroCard: React.FC<EmployeeHeroCardProps> = ({
  locationStatus,
  deviceStatus,
  branchName,
  shiftName,
  actionType,
  onAction,
  isLoading = false,
  actionDisabled = false,
  disabledReason,
  showSuccessMoment = false,
  successTime,
  onRetryLocation,
  onRequestManagerVerification,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(formatWesternTime(new Date(), true));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BasmaCard className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50/80 border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header Status Bar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <StatusBadge type="location" status={locationStatus} />
        <StatusBadge type="device" status={deviceStatus} />
      </div>

      {/* Live Digital Clock */}
      <div className="text-center my-4">
        <div className="text-3xl font-bold tracking-tight text-slate-900 dir-ltr font-mono">
          {currentTime || '08:00:00 ص'}
        </div>
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500 mt-1 font-medium">
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1e-5M9 11h1e-5M9 15h1e-5M15 7h1e-5M15 11h1e-5M15 15h1e-5" />
            </svg>
            {branchName || 'الفرع الرئيسي'}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {shiftName || 'الوردية العادية'}
          </span>
        </div>
      </div>

      {/* Location Uncertain Guidance Controls */}
      {locationStatus === 'UNCERTAIN' && (
        <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex flex-col gap-2">
          <p className="font-medium">إشارة الـ GPS ضعيفة في هذا الموقع. يمكنك إعادة المحاولة أو طلب موافقة المشرف.</p>
          <div className="flex items-center gap-2">
            {onRetryLocation && (
              <button
                onClick={onRetryLocation}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs transition-colors"
              >
                إعادة المحاولة
              </button>
            )}
            {onRequestManagerVerification && (
              <button
                onClick={onRequestManagerVerification}
                className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-lg font-medium text-xs transition-colors"
              >
                طلب تحقق من المشرف
              </button>
            )}
          </div>
        </div>
      )}

      {/* Master Attendance Button */}
      <div className="mt-2">
        <MasterActionButton
          actionType={actionType}
          onClick={onAction}
          isLoading={isLoading}
          disabled={actionDisabled}
          disabledReason={disabledReason}
        />
      </div>

      {/* Success Moment Animated Overlay */}
      {showSuccessMoment && (
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-20 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
            <svg className="w-10 h-10 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900">تم العملية بنجاح ✨</h3>
          <p className="text-sm font-semibold text-emerald-700 mt-1">{successTime || currentTime}</p>
        </div>
      )}
    </BasmaCard>
  );
};
