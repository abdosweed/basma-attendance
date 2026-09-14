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

