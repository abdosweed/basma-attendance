# Basma Attendance System - Rollout & Rollback Plan (v1.13.0)

**Project**: Basma Attendance System  
**Version**: 1.13.0  
**Phase**: Phase 11 - Full Production Rollout  
**Target Date**: 2026-09-16  

---

## 1. Overview & Rollback Policy

This document defines the non-destructive rollback protocol, emergency incident thresholds, change freeze guidelines, and system recovery procedures during the rollout of **Basma Attendance System (v1.13.0)**.

### Core Non-Destructive Principle:
> [!CAUTION]
> Under no circumstances shall `prisma migrate reset`, manual `DROP TABLE`, or destructive SQL operations be executed during an emergency rollback. The database schema migrations added in recent versions (including `PushSubscription` and `OtpChallenge`) are additive and backward-compatible.

---

## 2. Emergency Trigger Thresholds & Operational States

| Operational State | Trigger Condition | Required Action |
| :--- | :--- | :--- |
| **NORMAL ROLLOUT** | All acceptance gates passed; 0 Critical / 0 High issues. | Proceed to next wave after explicit Acceptance Gate approval. |
| **ROLLOUT HOLD** | Non-critical High issue or unexpected telemetry spike detected (e.g. elevated GPS uncertainty, device approval backlog). | Pause wave progression; perform root cause analysis; execute hotfix if needed without immediate rollback. |
| **ROLLBACK REQUIRED** | Critical incident occurred (Data Loss, Security Bypass, Geofence Failure, Cross-User Notification Leak). | Halt rollout immediately; revert application code deployment to previous stable tag; preserve database state. |

---

## 3. Incident Severity Classification

### CRITICAL (Rollback Required / Immediate Freeze):
- Complete system unavailablity on Vercel Production.
- Data loss or corruption of attendance records.
- Attendance recorded under wrong employee ID.
- Security bypass (unauthenticated attendance, geofence bypass).
- Cross-user push notification leakage.

### HIGH (Rollout Hold / Hotfix Required):
- Check-in functionality failing for > 5% of active users.
- Device approval workflow failing or blocking users > 30 minutes.
- Web Push gateway failing across all devices.
- Shift calculation error impacting attendance status.

### MEDIUM (Investigate & Patch):
- Isolated user location timeout.
- Intermittent SSE connection drops (handled by Smart Fallback Polling).
- Minor UI layout alignment on specific legacy mobile models.

### LOW (Document for Next Patch):
- Cosmetic text microcopy suggestions.
- Non-critical UX enhancement request.

---

## 4. Code Freeze & Hotfix Protocol

1. **Code Freeze Scope**: No new features, database schema alterations, or UI redesigns allowed during Phase 11.
2. **Hotfix Qualification**: Only fixes addressing **CRITICAL** or **HIGH** severity incidents qualify for hotfixes.
3. **Hotfix Versioning**: Hotfixes will increment patch version (e.g., `1.12.1`, `1.12.2`).
4. **Mandatory Retest**: Hotfixes must pass full automated suite (`scripts/test-phase10-8-push.ts`, `scripts/test-ui-visual-acceptance.ts`) before re-deploying.

---

## 5. Non-Destructive Application Rollback Procedure

In the event a **CRITICAL** incident requires application rollback:

```bash
# 1. Revert Git repository HEAD to last verified stable commit (v1.12.0)
git checkout tags/v1.12.0-verified

# 2. Re-verify database connectivity (Additive schema remains safe)
npx prisma generate

# 3. Trigger production deployment rebuild on Vercel
git push origin master --force-with-lease
```

---

## 6. Legacy System Parallel Run Guidelines

If a legacy attendance system exists during Wave 1 and Wave 2:
- Employees record attendance in both **Basma PWA** and the legacy system.
- Daily reconciliation compares records to verify accuracy, geofence bounds, and timing.
- No double accounting or duplicate payroll records are created in external ERP/HR systems.
