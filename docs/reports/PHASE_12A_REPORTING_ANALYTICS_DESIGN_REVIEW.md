# Phase 12A - Reporting & Analytics Design Review Report

**Project**: Basma Attendance System – نظام بصمة  
**Version**: v1.13.0  
**Phase**: Phase 12A - Reporting & Analytics Design Review  
**Target Date**: 2026-09-16  
**Status**: DESIGN REVIEW COMPLETED  
**Final Recommendation**: REPORTING DESIGN READY FOR APPROVAL  

---

## 1. Executive Summary

Phase 12A provides a comprehensive technical design review and architectural blueprint for the **Reporting & Management Analytics Module (Phase 12)** of the Basma Attendance System.

In strict adherence to project constraints:
- **Zero code edits** were made to the application logic.
- **Zero database schema changes** or Prisma migrations were executed.
- **Zero actual reports, charts, or export endpoints** were implemented.

The outcome of this phase is a fully specified, auditable design foundation that establishes standardized business definitions, metrics formulas, report catalogs, RBAC enforcement rules, Excel/PDF specifications, and query performance recommendations prior to starting implementation in Phase 12B.

---

## 2. Data Models Review & Schema Gap Analysis Matrix

An exhaustive inspection of existing database models (`Company`, `Branch`, `Department`, `Employee`, `TrustedDevice`, `Shift`, `EmployeeShift`, `AttendanceEvent`, `AttendanceRecord`, `BreakRecord`, `LeaveRequest`, `Holiday`, `LocationVerificationRequest`, `AuditLog`) was conducted:

| Business Requirement | Currently Supported? | Current Data Model & Source Field | Identified Gap / Limitation | Recommended Future Enhancement |
| :--- | :--- | :--- | :--- | :--- |
| **Daily Attendance Summary** | `YES` | `AttendanceRecord` (`date`, `checkInAt`, `checkOutAt`, `status`) | Fully supported | None |
| **Late Minutes Calculation** | `YES` | `AttendanceRecord.lateMinutes`, `Shift.gracePeriodMins` | Fully supported | None |
| **Break Overuse Tracking** | `YES` | `BreakRecord.excessMinutes`, `Shift.maxBreakMins` | Fully supported | None |
| **Location Verification Logs** | `YES` | `LocationVerificationRequest` (`status`, `confidenceScore`) | Fully supported | None |
| **Trusted Device Security** | `YES` | `TrustedDevice` (`status`, `approvedAt`, `reviewNote`) | Fully supported | None |
| **Paid vs Unpaid Breaks** | `NO` | Missing field in `Shift` or `Company` | Breaks currently track duration without paid/unpaid flag | Add `isPaidBreak` boolean in `Shift` (Phase 12B+) |
| **Overtime Approval Policy** | `NO` | `AttendanceRecord.overtimeMinutes` exists as raw diff | Lacks explicit manager pre-approval link | Add `overtimeStatus` (PENDING/APPROVED) (Phase 12B+) |
| **Audit Admin Adjustments** | `YES` | `AttendanceEvent.source = 'ADMIN_MANUAL'` & `AuditLog` | Supported via event log | Add direct relation between record & correction request |

---

## 3. Business Policy Decisions Required

Before implementing Phase 12B code, management must confirm 7 explicit business policy decisions:

1. **Grace Period Late Calculation**:
   - *Option A (Default)*: If arrival is after grace period (e.g. 09:15 with 10m grace), calculate `lateMinutes` from official shift start (`09:00` $\rightarrow$ 15 min late).
   - *Option B*: Calculate `lateMinutes` from end of grace period (`09:10` $\rightarrow$ 5 min late).
2. **Overtime Calculation Policy**:
   - *Option A*: Calculate overtime automatically for any time worked beyond `scheduledEnd` or `requiredHours`.
   - *Option B (Recommended)*: Require explicit Manager/HR approval before overtime is included in official reports.
3. **Paid vs Unpaid Break Deductions**:
   - Confirm whether `totalBreakMinutes` is deducted from gross worked hours or included in paid hours.
4. **Flexible Shift Late Policy**:
   - Confirm whether Flexible Shifts evaluate late arrival or strictly evaluate `requiredHours` completion.
5. **Incomplete Attendance Policy (Missing Check-Out)**:
   - Confirm whether missing check-out flags record as `INCOMPLETE` without auto-filling check-out time.
6. **Admin Adjustment Audit Policy**:
   - Confirm whether modified records display an explicit `ADMIN_ADJUSTED` visual badge in executive reports.
7. **Friday Rotation Absence Rule**:
   - Confirm that employees on `OFF` Friday rotation are classified as `OFF_DAY` and never flagged as `ABSENT`.

---

## 4. Report Catalog & Priority Matrix

Reports are categorized into 3 priority tiers based on operational necessity:

```text
               Phase 12 Report Catalog & Priority Architecture
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ P0 - CRITICAL OPERATIONAL REPORTS (Immediate Implementation)              │
 │ 1. Today's Live Attendance View (/admin/reports/live)                     │
 │ 2. Daily Attendance Report (/admin/reports/daily)                         │
 │ 3. Monthly Employee Attendance Summary (/admin/reports/monthly)           │
 │ 4. Absence & Tardiness Report (/admin/reports/late-absent)                │
 │ 5. Attendance Exceptions & Audit Log (/admin/reports/exceptions)          │
 │ 6. Individual Employee Attendance Profile (/admin/reports/employee/[id])  │
 ├───────────────────────────────────────────────────────────────────────────┤
 │ P1 - EXECUTIVE PERFORMANCE REPORTS (High Priority)                        │
 │ 7. Branch Performance Comparison (/admin/reports/branches)                │
 │ 8. Department Performance Comparison (/admin/reports/departments)         │
 │ 9. Break Usage & Overuse Analytics (/admin/reports/breaks)                │
 │ 10. Location Verification & GPS Analytics (/admin/reports/gps)            │
 ├───────────────────────────────────────────────────────────────────────────┤
 │ P2 - ADVANCED ANALYTICS (Future Enhancements)                             │
 │ 11. Trusted Device Security & Anomaly Report                              │
 │ 12. Comparative Multi-Month Trend Analytics                               │
 └───────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Executive Management Dashboard Concept

Path: `/admin/dashboard` or `/admin/analytics`

### Top Key Performance Indicators (KPI Cards):
1. **Present Today**: Count & percentage of expected employees currently present (`🟢 18 / 20 (90%)`).
2. **Late Today**: Count & total late minutes accrued today (`🟡 2 Employees (25 min total)`).
3. **Absent Today**: Count of unexcused absences today (`🔴 0 Employees`).
4. **Pending Verifications / Devices**: Actionable queue count (`⚠️ 0 Pending Requests`).

### Actionable Interactive Features:
- **Drill-Down Capability**: Clicking on "2 Late Employees" immediately filters and opens the Daily Attendance Report pre-filtered for `LATE` status today.
- **Alert Feed**: Real-time ticker for location verifications, device pending requests, and missing check-outs.

---

## 6. Unified Filter System & Privacy-Enforced RBAC

### 6.1. Unified Filter Bar Specification
All report views share a standardized responsive filter bar:
- **Date Range Picker**: Presets (`Today`, `Yesterday`, `This Week`, `This Month`, `Last Month`, `Custom Range`).
- **Branch Selector**: Filter by company branch.
- **Department Selector**: Filter by department.
- **Shift Selector**: Filter by shift type (`FIXED`, `FLEXIBLE`, `SPLIT`).
- **Status Selector**: Filter by attendance status (`PRESENT`, `LATE`, `ABSENT`, `LEAVE`, `INCOMPLETE`).
- **Source Selector**: Filter by input channel (`PWA_MOBILE`, `ADMIN_MANUAL`).

### 6.2. Privacy-Enforced RBAC Matrix
Backend API endpoints enforce strict authorization queries:

| Role | Permitted Reporting Scope | Backend Filtering Rule |
| :--- | :--- | :--- |
| **`SUPER_ADMIN` / `ADMIN`** | All company branches and employees | No branch restriction |
| **`HR`** | All company employees | No branch restriction |
| **`BRANCH_MANAGER`** | Assigned primary branch employees only | `WHERE branchId = manager.primaryBranchId` |
| **`EMPLOYEE`** | Personal attendance history only | `WHERE employeeId = currentUser.employeeId` |

> [!SECURITY]
> **Privacy Guarantee**: Reports NEVER expose user passwords, JWT tokens, OTP hashes, device fingerprint hashes, or raw numeric GPS coordinates.

---

## 7. Export Specifications (Excel & PDF)

### 7.1. Excel Export (`.xlsx`)
- **Format**: Native XLSX with Arabic RTL orientation (`sheet.views = [{ rightToLeft: true }]`).
- **Header Section**: Displays Company Name, Report Title, Applied Filters, and Generation Timestamp.
- **Table Formatting**: Frozen header row, auto-fitted column widths, explicit date (`YYYY-MM-DD`) and time (`HH:mm`) cell types.
- **Totals Row**: Formulas for sum of worked hours, late minutes, and break minutes.

### 7.2. PDF Export (`.pdf`)
- **Layout**: Official printable PDF layout with Basma branding header, page numbering (`Page X of Y`), and RTL Arabic typography.
- **Structure**: Executive summary KPI cards followed by structured data tables with alternating row shading for maximum legibility.

---

## 8. Database Index Recommendations (Recommendations Only)

To maintain sub-100ms query performance when historical records exceed 100,000 rows, the following PostgreSQL indexes are recommended for Phase 12B (No migrations created in 12A):

```sql
-- Recommended Index 1: Optimize date range queries by employee and status
CREATE INDEX IF NOT EXISTS "idx_attendance_record_emp_date_status" 
ON "AttendanceRecord" ("employeeId", "date", "status");

-- Recommended Index 2: Optimize branch/department aggregation queries
CREATE INDEX IF NOT EXISTS "idx_attendance_record_branch_date" 
ON "AttendanceRecord" ("branchId", "date");

-- Recommended Index 3: Optimize location verification reporting
CREATE INDEX IF NOT EXISTS "idx_location_req_status_date" 
ON "LocationVerificationRequest" ("status", "requestedAt");
```

---

## 9. Official Gate Summary & Next Steps

```text
PHASE: Phase 12A - Reporting & Analytics Design Review
STATUS: DESIGN REVIEW COMPLETED
CURRENT REPORTING CAPABILITIES: Basic live operational views & monthly CSV export
DATA MODELS REVIEWED: Company, Branch, Department, User, Employee, TrustedDevice, Shift, EmployeeShift, AttendanceEvent, AttendanceRecord, BreakRecord, LeaveType, LeaveRequest, PermissionRequest, AttendanceCorrectionRequest, Holiday, SuspiciousAttempt, LocationVerificationRequest, OtpChallenge, PushSubscription
TOP DATA GAPS: Documented (Overtime approval policy, Break paid/unpaid flag, Split shift period 2 check-in fields)
METRICS DEFINED: Fully specified in /docs/REPORTING_METRICS_DICTIONARY.md
BUSINESS DECISIONS REQUIRED: 7 Decisions documented for management approval
P0 REPORTS: 6 Core Reports designed
P1 REPORTS: 4 Advanced Reports designed
P2 REPORTS: 2 Future Reports designed
MANAGEMENT DASHBOARD CONCEPT: Designed with 4 Top KPIs, live alert ticker, and actionable drill-down
FILTER SYSTEM: Unified Filter Bar designed with 6 filter facets
RBAC MODEL: Mandatory Backend Filter Matrix specified for all 5 user roles
EXCEL DESIGN: Designed (Arabic RTL, Header Freezing, Applied Filters, Auto Width)
PDF DESIGN: Designed (Official Printable Layout, Basma Branding, Page Numbers)
PERFORMANCE CONSIDERATIONS: Server-side aggregation, Cursor Pagination, Streaming Export
INDEX RECOMMENDATIONS: 3 PostgreSQL Index Recommendations documented (NO migration created)
TIMEZONE POLICY: Business Timezone (Africa/Tripoli), DST-aware calculation, ISO-8601 storage
TEST STRATEGY: Boundary tests, Night shift tests, Split shift tests, Grace period tests defined
SCHEMA CHANGES REQUIRED: Zero changes required for P0/P1 MVP
RISKS: Documented
DOCS CREATED: 
- /docs/REPORTING_METRICS_DICTIONARY.md
- /docs/reports/PHASE_12A_REPORTING_ANALYTICS_DESIGN_REVIEW.md
- /docs/PROJECT_STATUS.md
- /docs/CHANGELOG.md
- /docs/DECISIONS.md (Decision 19: Reporting & Analytics Design Standards)
FINAL RECOMMENDATION: REPORTING DESIGN READY FOR APPROVAL
NEXT STEP: Wait for explicit user approval before starting Phase 12B Implementation.
```
