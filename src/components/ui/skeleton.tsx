'use client';

import React from 'react';

export interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200/70 dark:bg-slate-800/60 rounded-xl ${className}`}
      style={style}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-16" />
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
  );
}

export function ReportTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-50 dark:border-slate-800/50">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
            <Skeleton className="h-3 w-20 hidden sm:block" />
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
            <Skeleton className="h-3 w-16 font-mono shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AttendanceActionSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      {/* Top Status Pill Skeleton */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Main Biometric Card Skeleton */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl text-center space-y-6 flex flex-col items-center">
        <Skeleton className="h-6 w-36 rounded-xl" />
        <div className="py-2">
          <Skeleton className="w-44 h-44 rounded-full" />
        </div>
        <Skeleton className="h-3 w-48" />
      </div>

      {/* Quick Summary Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>
    </div>
  );
}
