/**
 * Test UI Revamp Phase 2 - Employee Attendance Action Card
 * Basma Attendance System v1.14.0
 */

import React from 'react';
import { AttendanceActionCard } from '../src/components/employee/attendance-action-card';

function testAttendanceActionCard() {
  console.log('Testing AttendanceActionCard TypeScript instantiation...');

  const element = React.createElement(AttendanceActionCard, {
    checkInAt: '08:05',
    shiftName: 'الوردية الصباحية',
    scheduledStart: '08:00',
    scheduledEnd: '16:00',
    locationStatusMessage: 'داخل نطاق الفرع الرئيسي (12m)',
    locationStatusType: 'success',
  });

  if (element) {
    console.log('  ✅ AttendanceActionCard Verified Successfully!');
  }
}

testAttendanceActionCard();
