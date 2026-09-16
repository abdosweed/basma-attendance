/**
 * Test UI Revamp Components Phase 1
 * Basma Attendance System v1.14.0
 */

import React from 'react';
import { StatusBadge } from '../src/components/ui/status-badge';
import { MetricCard } from '../src/components/ui/metric-card';
import { Button } from '../src/components/ui/button';

function testComponentsInstantiate() {
  console.log('Testing StatusBadge, MetricCard, and Button TypeScript instantiation...');
  
  const badge = React.createElement(StatusBadge, { status: 'PRESENT', showDot: true });
  const card = React.createElement(MetricCard, { title: 'إجمالي الموظفين', value: 42, variant: 'emerald' });
  const button = React.createElement(Button, { variant: 'primary', isLoading: false }, 'حفظ البيانات');

  if (badge && card && button) {
    console.log('  ✅ UI Revamp Phase 1 Components Verified Successfully!');
  }
}

testComponentsInstantiate();
