# 🧪 TESTING.md - دليل وااختبارات المنظومة

## Phase 1 Acceptance Tests
1. **Strong Password Policy Test**:
   - Scenario: Try setting password to '123' or 'admin'.
   - Expected: Validation error rejecting short/weak password.
   - Result: PASS.

2. **Login Rate Limiting Test**:
   - Scenario: Submit 5 incorrect password attempts sequentially.
   - Expected: Account locked for 15 minutes with 429 status code.
   - Result: PASS.

3. **Must Change Password Flow Test**:
   - Scenario: Flag account with mustChangePassword = true and log in.
   - Expected: User redirected to password change prompt.
   - Result: PASS.

## Phase 6 Acceptance Tests (v1.6.0)
- **Command**: `npx tsx scripts/test-phase6-suite.ts`
- **Result**: 18/18 PASSED (100%).
- **Scenarios Covered**:
  1. User stream connection & registration
  2. Notification payload delivery
  3. Multi-user recipient isolation
  4. Disconnect stream cleanup
  5. Automatic reconnect backoff
  6. Duplicate notification protection
  7. Logout stream teardown
  8. Session expiry safety
  9. Device Approval event
  10. Geofence EXIT event
  11. Geofence RETURN event
  12. Location Verification event
  13. Read notification DB sync
  14. Mark All as Read DB sync
  15. 20 Concurrent clients simulation
## Phase 7 Acceptance Tests (v1.7.0)
- **Command**: `npx tsx scripts/test-phase7-suite.ts`
- **Result**: 16/16 PASSED (100%).
- **Scenarios Covered**:
  1. System Health Report generation (`getSystemHealthReport()`)
  2. Version update check (v1.7.0)
  3. Database health & latency check (`SELECT 1`)
  4. Realtime status check (SSE + Fallback Polling)
  5. Notification telemetry metrics
  6. Trusted Devices telemetry metrics
  7. GPS & Geofence Confidence Engine metrics
  8. Cryptographic OTP Engine status
  9. Auth Security & Account Lockout metrics
  10. Attendance Engine & Shift Rotation metrics
  11. Database Integrity Checks (Orphan/Anomaly checks)
  12. Backup Status explicitly returns `NOT VERIFIED`
  13. Known Limitations Cards list (5 items)
  14. Zero Secrets Exposure Security Audit
  15. System Health Score calculation formula (0-100)
  16. Critical Incident Banner detection logic
## Phase 8 Acceptance Tests (v1.8.0)
- **Command**: `npx tsx scripts/test-phase8-suite.ts`
- **Result**: 17/17 PASSED (100%).
- **Scenarios Covered**:
  1. Direct database connection check
  2. Backup snapshot creation (`createDatabaseBackup()`)
  3. SHA-256 Checksum calculation & metadata serialization
  4. Production Safety Guard verification (Aborts restore targeting Production DB)
  5. Isolated Restore execution & table count validation
  6. User table count match
  7. Employee table count match
  8. AttendanceEvent table count match
  9. TrustedDevice table count match
  10. SystemSettings table count match
  11. Foreign Key integrity verification (0 orphan records)
  12. Data Sampling verification
  13. Prisma Migrations status check (`Database schema is up to date`)
  14. Schema Drift check (Zero drift)
  15. Measurement of RTO (< 2s) & RPO (24h)
  16. Security Audit (0 secrets logged or written)
  17. System Health Backup Card status update (`HEALTHY / VERIFIED`)
