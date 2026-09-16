'use client';

import React from 'react';
import { Button } from './button';

export interface AttendanceFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timeStr?: string;
  branchName?: string;
  onRetry?: () => void;
  onRequestManualApproval?: () => void;
}

export function AttendanceFeedbackModal({
  isOpen,
  onClose,
  type = 'success',
  title,
  message,
  timeStr,
  branchName,
  onRetry,
  onRequestManualApproval,
}: AttendanceFeedbackModalProps) {
  if (!isOpen) return null;

  const iconMap = {
    success: {
      icon: '🎉',
      bgClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      borderClass: 'border-emerald-200 dark:border-emerald-800',
      buttonVariant: 'primary' as const,
    },
    warning: {
      icon: '⚠️',
      bgClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      borderClass: 'border-amber-200 dark:border-amber-800',
      buttonVariant: 'outline' as const,
    },
    error: {
      icon: '❌',
      bgClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      borderClass: 'border-rose-200 dark:border-rose-800',
      buttonVariant: 'danger' as const,
    },
  }[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      dir="rtl"
    >
      <div className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-5 animate-scaleUp">
        {/* Animated Icon Circle */}
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl border ${iconMap.bgClass} ${iconMap.borderClass}`}>
          {iconMap.icon}
        </div>

        {/* Title & Message */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Optional Metadata Details Card */}
        {(timeStr || branchName) && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
            {timeStr && (
              <div className="flex justify-between text-slate-600 dark:text-slate-300 font-mono">
                <span>توقيت العملية:</span>
                <span className="font-bold">{timeStr}</span>
              </div>
            )}
            {branchName && (
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>الفرع المعتمد:</span>
                <span className="font-semibold">{branchName}</span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {onRetry && (
            <Button variant="primary" fullWidth onClick={onRetry}>
              🔄 إعادة المحاولة
            </Button>
          )}

          {onRequestManualApproval && (
            <Button variant="outline" fullWidth onClick={onRequestManualApproval}>
              ✏️ طلب تأكيد موظف من الإدارة
            </Button>
          )}

          <Button variant={iconMap.buttonVariant} fullWidth onClick={onClose}>
            حسناً، فهمت
          </Button>
        </div>
      </div>
    </div>
  );
}
