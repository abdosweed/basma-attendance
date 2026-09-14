# 📝 CHANGELOG.md - سجل التغييرات

All notable changes to this project will be documented in this file.

## [1.5.0] - 2026-09-14 - COMPLETED & VALIDATED

### Added
- إنجاز مرحلة المصالحة لقاعدة البيانات (Baseline Reconciliation) وتثبيت الهجرة الرسمية `20260914000000_baseline_production_schema` بسلامة بيانات 100%.
- إنشاء وإدراج عقد الهجرة الرسمي `20260914010000_add_otp_hardening` وتطبيقه بـ `prisma migrate deploy`.
- إطلاق محرك تأكيدات الـ OTP المشفر (`src/lib/otp.ts`) وتخزين SHA-256 Hash بدلاً من النص الصريح.
- تقييد معدل الإعادة (60s Resend Cooldown) وتحديد 5 محاولات فاشلة قبل الحظر التلقائي للرمز (BLOCKED).
- حظر تسريب أرقام الـ OTP في سجلات التدقيق AuditLog أو سجلات الخطأ.
- إنشاء واجهات API للطلب والتحقق `/api/auth/otp/request` و `/api/auth/otp/verify`.
- إضافة حزمة اختبارات بالرمز `scripts/test-phase5-suite.ts` (9/9 Tests PASSED - 100%).
- إنشاء تقرير الهجرة `/docs/reports/PHASE_05A_DATABASE_MIGRATION_BASELINE_REPORT.md` وتقرير OTP `/docs/reports/PHASE_05_OTP_REPORT.md`.

## [1.4.0] - 2026-09-14 - COMPLETED & VALIDATED

### Added
- مراجعة واستبدال مصطلح `Hardware Locked Device` بـ `Approved Device Model` (الجهاز المعتمد).
- إنشاء وحدات التحكم والتقييم `src/lib/device.ts` لدعم توليد وتشفير الـ Device Token بـ SHA-256.
- دعم 5 سياسات للأجهزة في النظام (`DISABLED`, `ALLOW_MULTIPLE`, `ONE_DEVICE_ONLY`, `REQUIRE_APPROVAL`, `BLOCK_UNKNOWN`).
- إضافة مسار التحكم الإداري `/api/admin/devices/[id]/action` بدعم معاملات الاعتماد والاستبدال الأحادية والرفض والحظر وإلغاء الاعتماد الشامل.
- إضافة فحص التداخل ومنع استخدام مفتاح نفس الجهاز لموظفين مختلفين (`DEVICE_TOKEN_ACCOUNT_MISMATCH`).
- إضافة اختبارات شاملة في `scripts/test-phase4-suite.ts` (6/6 Tests PASSED - 100%).
- إنشاء تقرير المرحلة الرابعة `/docs/reports/PHASE_04_TRUSTED_DEVICE_REPORT.md`.

## [1.3.0] - 2026-09-14 - COMPLETED & VALIDATED

### Added
- إنشاء جدول `LocationVerificationRequest` في قاعدة البيانات لتقديم موافقات تأكيد الموقع المشروطة.
- إتاحة مسار API لإنشاء الطلبات `/api/attendance/location-requests` ومسار المراجعة `/api/attendance/location-requests/[id]/review`.
- تسجيل مصدر عملية الحضور الناتجة كـ `ADMIN_VERIFIED` لتمييز البصمات المؤكدة إدارياً عن البصمات المباشرة.
- تقييد تقديم الطلب بشرط الحالة `UNCERTAIN` والمسافة <= 60m، وحظر تقديم الطلبات خارج النطاق بوضوح.
- إضافة ميزة انتهاء صلاحية الطلبات تلقائياً بعد 5 دقائق وتأمين فحص السيرفر لمنع أي تلاعب محلي.
- إضافة حزمة اختبارات بالرمز `scripts/test-phase3-suite.ts` (6/6 Tests PASSED).
- إنشاء تقرير المرحلة الثالثة `/docs/reports/PHASE_03_LOCATION_FALLBACK_REPORT.md`.

## [1.2.0] - 2026-09-14 - COMPLETED & VALIDATED

### Added
- إطلاق محرك ثقة الموقع المتقدم (Multi-sample Location Confidence Engine) في src/lib/geofence.ts.
- إضافة وتفعيل الـ 6 حالات للموقع (INSIDE_CONFIRMED, UNCERTAIN, OUTSIDE_CONFIRMED, LOCATION_UNAVAILABLE, AUTHORIZED_OUTSIDE, MONITORING_SUSPENDED).
- فصل قيم إعدادات المحرك (geofenceRadius, uncertaintyZoneEnd, exitThreshold, returnThreshold, minimumExitReadings, minimumReturnReadings, maxAcceptableAccuracy).
- ربط محرك التقييم بمسار تسجيل الحضور /api/attendance/check-in وتحديث واجهة الموظف في src/app/page.tsx.
- إضافة مصفوفة اختبارية شاملة 12/12 حالة بنسبة نجاح 100% (scripts/test-location-engine-suite.ts).
- إنشاء وتحديث تقرير المرحلة الثانية /docs/reports/PHASE_02_LOCATION_ENGINE_REPORT.md.

## [1.1.0] - 2026-09-14
- إمضاء المرحلة الأولى وتفعيل تحصين الأمان، سياسة كلمات المرور وحظر التخمين.

## [1.0.0] - 2026-09-13

