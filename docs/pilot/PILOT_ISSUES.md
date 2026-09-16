# 🐛 PILOT_ISSUES.md - سجل متابعة ومعالجة مشكلات المرحلة التجريبية (Phase 10)

**مشروع**: Basma Attendance System – بصمة (v1.10.0)  
**فترة التجربة**: 2026-09-14 إلى 2026-09-16  

---

## 1. ملخص المشكلات الفنية والتشغيلية

| Issue ID | Date | Employee / Platform | Severity | Description | Status | Retest Result |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-01** | 2026-09-14 | Pilot Employee B (iOS Safari PWA) | `LOW` | تأخر بسيط (2-3 ثوان) في تحديث شارة الإشعارات عند العودة من الخلفية بعد 10 دقائق. | `CLOSED` | `RETEST PASSED` (تأكيد التزامن التلقائي فور عودة التركيز). |
| **ISSUE-02** | 2026-09-15 | Pilot Employee A (Android Chrome PWA) | `LOW` | إشارة GPS ضعيفة داخل التسقيف المكتبي المعزول (دقة 45m). | `CLOSED` | `RETEST PASSED` (محرك Location Confidence صنف الحالة كـ UNCERTAIN ثم نجح إعادة المحاولة). |

---

## 2. ملخص الخطورة والحالة

- **CRITICAL Issues**: `0` (Zero Data Loss, Zero Security Bypass, Zero Wrong Employee Attendance).
- **HIGH Issues**: `0` (Zero Core Attendance Failures).
- **MEDIUM Issues**: `0`.
- **LOW Issues**: `2` (Resolved & Verified).
