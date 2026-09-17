'use client';

import React from 'react';
import { StatusBadge as CanonicalStatusBadge } from './StatusBadge';
import { ReportingStatus, ReportFlag } from '@/lib/reporting/types';

export type StatusBadgeType = ReportingStatus | ReportFlag | 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

export interface StatusBadgeProps {
  status: StatusBadgeType | string;
  label?: string;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  return (
    <CanonicalStatusBadge
      status={status}
      label={label}
      size={size}
      className={className}
    />
  );
}
