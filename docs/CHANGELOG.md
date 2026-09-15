# 📝 CHANGELOG.md - سجل التغييرات

All notable changes to this project will be documented in this file.

## [1.8.0] - 2026-09-15 - COMPLETED & VALIDATED

### Added
- إنجاز واختبار مرحلة النسخ الاحتياطي واستعادة البيانات (Backup & Restore Verification v1.8.0).
- إدراج صمام أمان برمجي صارم (Safety Guard) يمنع ويفشل أي عملية استرجاع تستهدف قاعدة البيانات الحية (`RESTORE TO PRODUCTION IS FORBIDDEN IN TEST MODE`).
- إنشاء أداة توليد لقطات النسخ الاحتياطي المشفرة `scripts/backup-database.ts` وحساب التوقيع الرقمي SHA-256 Checksum وتخزين الملفات في مجلد مؤقت معزول ومحمي عن Git.
- إنشاء محرك فحص وتدقيق الاسترجاع `scripts/restore-database.ts` على بيئة معزولة ومطابقة أعداد السجلات لـ 15 جدولا بنسبة 100% وخلوها من السجلات اليتيمة.
- تحديث كارت النسخ الاحتياطي بشاشة صحة المنظومة `/admin/system-health` إلى **`HEALTHY / VERIFIED`**.
- إنشاء دليل الطوارئ والعمليات التشغيلية لاسترجاع البيانات `/docs/RESTORE_RUNBOOK.md`.
- إضافة حزمة اختبارات بالرمز `scripts/test-phase8-suite.ts` (17/17 Tests PASSED - 100%).
- إنشاء التقرير الفني `/docs/reports/PHASE_08_BACKUP_RESTORE_REPORT.md`.

## [1.7.0] - 2026-09-15 - COMPLETED & VALIDATED

### Added
- إطلاق شاشة ومحرك صحة المنظومة التشغيلية (System Health & Operations Dashboard v1.7.0) في المسار المحمي `/admin/system-health`.
- بناء محرك التشخيص الفني `src/lib/system-health.ts` لفحص 12 محركاً تشغيلياً (PostgreSQL Query Latency, Supabase Cloud, SSE Realtime, Trusted Devices, Geofence Engine, OTP, Auth Security, Attendance, Integrity, Backup).
- تطبيق حماية RBAC صارمة على مسار الـ API `/api/admin/system-health` (السماح للإدارة وحظر حسابات الموظفين HTTP 403 Forbidden).
- التزام تام بحماية الأسرار (Zero Secrets Exposure) وخلو مخرجات الـ API من كلمات المرور أو التوكنات أو سلاسل DATABASE_URL.
- عرض حالة النسخ الاحتياطي بصراحة كـ `NOT VERIFIED` مع التوجيه للمرحلة 8 Phase 8.
- إضافة حزمة اختبارات بالرمز `scripts/test-phase7-suite.ts` (16/16 Tests PASSED - 100%).
- إنشاء التقرير الفني `/docs/reports/PHASE_07_SYSTEM_HEALTH_REPORT.md`.

## [1.6.0] - 2026-09-15 - COMPLETED & VALIDATED

### Added
- إطلاق واختبار اعتمادية نظام الإشعارات اللحظية SSE Production Reliability (النسخة 1.6.0).
- إضافة نبضات القلب (15s Heartbeat Ping) في خادم الـ SSE للحفاظ على استمرارية الاتصال على Vercel Serverless.
- دعم إعادة التشغيل التلقائي بالأحداث المفقودة (Last-Event-ID Replay Support) من قاعدة البيانات عند إعادة الاتصال.
- إضافة التراجع التنازلي الموزون (Exponential Backoff 1s to 30s max with jitter) عند انقطاع الشبكة.
- إضافة حماية منع التكرار البرمجي (Duplicate Protection) وتصفية الـ `eventId` / `notificationId`.
- إطلاق محرك الاستعلام المتردد التلقائي المزدوج (Smart Fallback Polling كل 30s) والذي ينشط فقط عند انقطاع الـ SSE ويتوقف فور عودته.
- إضافة الإغلاق والتنظيف المباشر لـ EventSource فور تسجبل الخروج Logout.
- إضافة حزمة اختبارات آليية شاملة `scripts/test-phase6-suite.ts` (18/18 Tests PASSED - 100%).
- إنشاء تقرير المرحلة الفني `/docs/reports/PHASE_06_REALTIME_RELIABILITY_REPORT.md`.

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

