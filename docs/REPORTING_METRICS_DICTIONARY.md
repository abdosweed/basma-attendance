# Basma Attendance System - Reporting Metrics Dictionary

**Project**: Basma Attendance System (منظومة تطبيق البصمة الذكي)  
**Version**: v1.13.0  
**Document**: Reporting Metrics Dictionary & Business Rules Definition  
**Status**: APPROVED DESIGN SPECIFICATION  

---

## 1. Core Attendance Business Definitions

### 1.1. Attendance Day Definition (`date` boundary)
- **Standard Day Shift**: The business date is defined by the `YYYY-MM-DD` date of the scheduled shift start time in the company timezone (`Africa/Tripoli`).
- **Night Shift (`isNightShift = true`)**: For shifts spanning across midnight (e.g., 22:00 to 06:00 next morning), the entire attendance record (check-in, breaks, check-out) is bound exclusively to the **Shift Start Date** (`YYYY-MM-DD`). Check-out occurring at 06:00 on day $D+1$ is recorded under Day $D$ without splitting into two dates.

### 1.2. Status Classifications

| Status Code | Arabic Label | Definition & Business Condition | Formula / Rule |
| :--- | :--- | :--- | :--- |
| **`PRESENT`** | حاضر (في الوقت) | Valid Check-In recorded within `scheduledStart` + `gracePeriodMins`. | `checkInAt <= shiftStart + grace` |
| **`LATE`** | متأخر | Check-In recorded after `scheduledStart` + `gracePeriodMins`. | `checkInAt > shiftStart + grace` |
| **`ABSENT`** | غائب | No Check-In recorded by end of shift, and date is a scheduled work day with no approved Leave or Holiday. | `checkInAt IS NULL AND isWorkingDay AND NOT (isLeave OR isHoliday)` |
| **`LEAVE`** | في إجازة | Scheduled work day covered by an `APPROVED` `LeaveRequest`. | `date IN ApprovedLeaveRange` |
| **`OFF_DAY`** | عطلة أسبوعية / رسمية | Date is a non-working day (`workingDays` list), Friday rotation off, or company `Holiday`. | `NOT isWorkingDay OR isHoliday` |
| **`INCOMPLETE`** | بصمة غير مكتملة | Check-In recorded but missing Check-Out after shift end + 4 hours. | `checkInAt IS NOT NULL AND checkOutAt IS NULL AND currentTime > shiftEnd + 4h` |

---

## 2. Core Operational Metrics Formulas

### 2.1. Late Minutes Calculation (`lateMinutes`)
- **Formula**:
  $$\text{lateMinutes} = \max\left(0, \text{floor}\left(\frac{\text{actualCheckIn} - (\text{scheduledStart} + \text{gracePeriodMins})}{60000}\right)\right)$$
- **Approved Business Rule (Grace Period Boundary)**:
  Tardiness calculation starts ONLY after the expiration of the grace period. If `actualCheckIn <= scheduledStart + gracePeriodMins`, then `lateMinutes = 0`. If `actualCheckIn > scheduledStart + gracePeriodMins`, `lateMinutes` is computed as `actualCheckIn - (scheduledStart + gracePeriodMins)`.
- **Numeric Boundary Examples**:
  - *Shift Start*: `09:00`, *Grace*: `10 min` (`effectiveStart` = `09:10`).
  - *Check-In*: `09:07` $\rightarrow$ `ON_TIME` (`lateMinutes = 0`).
  - *Check-In*: `09:10` $\rightarrow$ `ON_TIME` (`lateMinutes = 0`).
  - *Check-In*: `09:11` $\rightarrow$ `LATE` (`lateMinutes = 1 min`).
  - *Check-In*: `09:15` $\rightarrow$ `LATE` (`lateMinutes = 5 min`).

### 2.2. Early Leave Minutes (`earlyLeaveMinutes`)
- **Formula**:
  $$\text{earlyLeaveMinutes} = \max\left(0, \text{floor}\left(\frac{\text{scheduledEnd} - \text{actualCheckOut}}{60000}\right)\right)$$
- Applies to `FIXED` shifts when `actualCheckOut < scheduledEnd` without an approved early exit permission.

### 2.3. Work Duration Calculations (`totalWorkedMinutes`)
- **Gross Worked Duration**:
  $$\text{GrossMinutes} = \text{floor}\left(\frac{\text{actualCheckOut} - \text{actualCheckIn}}{60000}\right)$$
- **Net Worked Duration**:
  $$\text{NetWorkedMinutes} = \text{GrossMinutes} - \text{DeductibleBreakMinutes}$$

---

## 3. Shift Type Specific Rules

### 3.1. Flexible Shift (`ShiftType = FLEXIBLE`)
- **Late Rule**: Not evaluated against fixed start time.
- **Completion Condition**: Evaluated against `requiredHours` (e.g. 8.0 hours).
- **Shortage**: If `totalWorkedMinutes < requiredHours * 60`, remaining minutes are recorded as `shortageMinutes`.

### 3.2. Split Shift (`ShiftType = SPLIT`)
- **Periods**: Period 1 (`startTime` - `endTime`) and Period 2 (`splitStartTime` - `splitEndTime`).
- **Attendance**: Checked-in for Period 1 and Period 2. Attendance is `PRESENT` if both periods are satisfied.

### 3.3. Friday Rotation (`rotateFriday = true`)
- **Condition**: If `fridayShiftType == 'OFF'`, Friday is `OFF_DAY`. If `fridayShiftType == 'MORNING'`, Friday is evaluated as a normal scheduled work day.

---

## 4. Operational & Exception Metrics

### 4.1. GPS & Location Verification Analytics
- **`INSIDE_CONFIRMED_COUNT`**: Count of punches verified inside geofence radius (`confidenceScore >= 80`).
- **`UNCERTAIN_COUNT`**: Count of punches requiring verification (`30m <= distance <= 60m`).
- **`OUTSIDE_CONFIRMED_ATTEMPTS`**: Count of rejected attempts outside geofence.
- **`LOCATION_VERIFICATION_REQUESTS`**: Count of manager location verification requests (`PENDING`, `APPROVED`, `REJECTED`).

### 4.2. Trusted Device Analytics
- **`APPROVED_DEVICES_COUNT`**: Active approved devices per employee/company.
- **`PENDING_DEVICES_COUNT`**: Queue of device approval requests waiting for admin review.
- **`BLOCKED_DEVICES_COUNT`**: Devices blocked for security violations.

### 4.3. Admin Adjustments & Auditability
- **`ADMIN_ADJUSTED_FLAG`**: Set to `true` when an `AttendanceRecord` is manually adjusted via `AttendanceCorrectionRequest` or Admin override. Original timestamps remain preserved in immutable `AttendanceEvent` log.

---

## 5. Summary Matrix & Role Visibility (RBAC)

| Metric Code | Data Source Table | Formula / Field | Role Visibility |
| :--- | :--- | :--- | :--- |
| **`lateMinutes`** | `AttendanceRecord` | `lateMinutes` | All Roles (Scoped) |
| **`earlyLeaveMinutes`** | `AttendanceRecord` | `earlyLeaveMinutes` | All Roles (Scoped) |
| **`totalWorkedMinutes`** | `AttendanceRecord` | `totalWorkedMinutes` | All Roles (Scoped) |
| **`excessBreakMinutes`** | `BreakRecord` | `sum(excessMinutes)` | All Roles (Scoped) |
| **`overtimeMinutes`** | `AttendanceRecord` | `overtimeMinutes` | HR, Admin, SuperAdmin |
| **`verificationRequests`**| `LocationVerificationRequest` | `count(id)` | BranchManager, HR, Admin |
| **`pendingDevices`** | `TrustedDevice` | `count(status='PENDING')` | BranchManager, HR, Admin |
