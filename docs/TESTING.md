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
  16. Reconnect storm backoff simulation
  17. Fallback polling activation on SSE drop
  18. Fallback polling deactivation on SSE reconnect
