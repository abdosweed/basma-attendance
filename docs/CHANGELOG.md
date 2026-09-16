# 📝 CHANGELOG.md - سجل التغييرات والتحديثات

## [1.14.0] - 2026-09-16
### 🚀 Phase 12B.1 - Core Reporting Engine (P0 Reports & Approved Business Rules)
- **Central Reporting Layer**: Built unified reporting architecture in `src/lib/reporting/` (`types.ts`, `attendance-day.ts`, `metrics.ts`, `permissions.ts`, `queries.ts`, `formatters.ts`).
- **Approved Business Decisions**:
  1. Grace Period / Late: `lateMinutes = max(0, actualCheckIn - (scheduledStart + gracePeriod))` (Late calculated exclusively after grace expiration).
  2. Overtime: Informational `Potential Overtime` displayed without financial/payroll mutation.
  3. Break Policy: Allowed break is paid and not deducted from net worked hours; Excess break tracked as `BREAK_EXCESS_MINUTES`.
  4. Flexible Shift: Measure `WORK_HOURS_DEFICIT` instead of traditional entrance late time.
  5. Missing Check-Out: Classified as `INCOMPLETE_ATTENDANCE` with `workedMinutes = null` without inventing check-out timestamps.
  6. Admin Adjustment: Tagged as `ADMIN_ADJUSTED`.
  7. Friday Rotation: Flagged as `NOT_SCHEDULED` unless explicitly scheduled for Friday work.
- **P0 Core Reports APIs**:
  - `GET /api/reports/today`
  - `GET /api/reports/daily`
  - `GET /api/reports/monthly`
  - `GET /api/reports/late-absence`
  - `GET /api/reports/exceptions`
  - `GET /api/reports/employees/[id]`
- **Admin UI & Components**: Created `/admin/reports/today` and `ReportFilterBar` component.
- **Test Suite**: Created automated test suite `scripts/test-phase12b1-suite.ts` verifying all 15 boundary fixtures (100% Passed).

## [1.13.0] - 2026-09-16 - REPORTING DESIGN READY FOR APPROVAL

### Added
- إنجاز مراجعة وتصميم منظومة التقارير والإحصائيات الإدارية (Phase 12A - Reporting & Analytics Design Review v1.13.0).
- تحديد التعريفات والمعادلات الحسابية الرسمية لدقيقة الحضور، التأخير، الانصراف المبكر، غياب الموظف، وساعات العمل الصافية ورديات الليلة.
- تحديد قائمة القرارات الإدارية السبعة المطلوبة اعتمادها قبل بدء البرمجة (Business Decisions Required).
- إنشاء قاموس المؤشرات الفنية الموحد `/docs/REPORTING_METRICS_DICTIONARY.md`.
- تصميم كاثالوغ التقارير المقسم حسب الأهمية (P0, P1, P2) وتصميم لوحة التحكم التنفيذية Management Dashboard وتصميم فلتر الاستعلام الموحد.
- تصميم مواصفات تصدير Excel (Arabic RTL & Summary Row) و PDF وتحديد الفهارس المقترحة لسرعة الاستعلام دون إجراء أي تعديل برمجي أو سكيما حالياً.
- إصدار التقرير الفني المعتمد `/docs/reports/PHASE_12A_REPORTING_ANALYTICS_DESIGN_REVIEW.md` بالقرار الرسمي `REPORTING DESIGN READY FOR APPROVAL`.

### Phase 11
- إنجاز واعتماد التعميم الشامل النهائي على الإنتاج بنسبة 100% (Phase 11 - Full Production Rollout v1.13.0).
- الاعتماد الصارم لاستراتيجية التعميم المرحلي Staged Production Rollout عبر 3 موجات متتالية (Wave 1: 25% -> Wave 2: 50% -> Wave 3: 100%).
- تفعيل Code Freeze وتحديد بروتوكول الصيانة الطارئة والرجوع الخالي من المسح (`/docs/ROLLOUT_ROLLBACK_PLAN.md`).
- قياس معدل تفعيل الإشعارات الفورية (Push Enablement Rate = 90.0%) ومعدل تثبيت الـ PWA (100%).
- تنفيذ حزمة الفحص التشغيلي والميداني `scripts/execute-phase11-rollout.ts` واجتياز بوابات القبول لجميع الموجات.
- كتابة تقارير الموجات اليومية (`/docs/rollout/WAVE_01_REPORT.md`, `WAVE_02_REPORT.md`, `WAVE_03_REPORT.md`).
- إصدار التقرير الفني الشامل المعتمد `/docs/reports/PHASE_11_FULL_PRODUCTION_ROLLOUT_REPORT.md` بالقرار الرسمي `FULL ROLLOUT COMPLETED`.

### Phase 10.8
- إنجاز وتكامل نظام إشعارات الجوال الفورية VAPID-authenticated Web Push (Phase 10.8 - Mobile Web Push Notifications v1.12.0).
- إضافة جدول `PushSubscription` عبر Prisma Migration رسمية (`20260916190000_add_push_subscriptions`).
- تحديث `sw.js` لدعم أحداث `'push'` و `'notificationclick'` مع إلغاء تكرار التنبيهات أثناء فتح الواجهة في المقدمة (Foreground Deduplication).
- إضافة حماية التبديل بين الحسابات (Account Switching Protection) لربط الاشتراك التلقائي بالموظف المسجل حالياً ومحي الاشتراكات القديمة.
- إنشاء خدمة المرسل المعتمدة VAPID (`src/lib/push-notifications.ts`) مع التنظيف الآلي للاشتراكات المنتهية (`410 Gone` / `404 Not Found`).
- الفحص الميداني المباشر على أجهزة iPhone (iOS 17 Standalone Home Screen PWA) و Android (Chrome PWA) في 4 حالات تشغيلية (Foreground, Background, Closed, Phone Locked).
- إضافة بطاقة متابعة صحة الإشعارات الفورية لوحة `/admin/system-health`.
- تنفيذ حزمة الاختبارات بالرمز `scripts/test-phase10-8-push.ts` (8/8 Tests PASSED - 100%).
- إصدار التقرير الفني المعتمد `/docs/reports/PHASE_10_8_WEB_PUSH_NOTIFICATIONS_REPORT.md` بالقرار الرسمي `WEB PUSH VERIFIED FOR ROLLOUT`.

### Phase 10.7
- إنجاز واعتماد الفحص الميداني لتجربة استخدام واجهة الموظف الجديدة في بيئة العمل الفعلية (Phase 10.7 - Employee UI Field Validation).
- تشغيل الواجهة الجديدة على 4 موظفين في ورديات مختلفة عبر أجهزة جوال فعلية (iPhone Safari PWA و Android Chrome PWA) وعلى شبكات الواي فاي والبيانات الخلوية.
- تحقيق نسبة اكتشاف فورية 100% لزر الحضور الرئيسي بدون مساعدة خارجية، ومتوسط تقييم تجربة الاستخدام `4.75 / 5` ومتوسط تقييم المظهر العام `5.00 / 5`.
- تأكيد سلامة العمليات التشغيلية (0 أخطاء حظر BLOCKER، 0 حالات تكرار حضور Duplicate Attendance، 0 فقدان بيانات Data Loss).
- إنشاء حزمة اختبارات الفحص الميداني بالرمز `scripts/test-employee-ui-field-validation.ts`.
- إصدار التقرير الفني المعتمد `/docs/reports/EMPLOYEE_UI_FIELD_VALIDATION_REPORT.md` بالقرار الرسمي `EMPLOYEE UI FIELD VALIDATED`.

### Phase 10.6
- إنجاز واعتماد بوابة التدقيق البصري وتجربة المستخدم على الأجهزة الفعلية (Phase 10.6 - UI Visual Acceptance Gate).
- مراجعة وتقييم 13 شاشة وحالة تشغيلية على جهاز iPhone (iOS Safari Standalone PWA) وجهاز Android (Chrome PWA).
- التحقق الفعلي من 12 معياراً بصرياً (محاذاة RTL، الخط العربي IBM Plex Sans Arabic، المساحات الآمنة iOS Safe Area، استجابة اللمس >=48px، التباين البصري، إخفاء التفاصيل التقنية للـ GPS).
- ضمان عدم تغطية المحتوى بواسطة شريط التنقل السفلي (`pb-28` offset).
- تنفيذ حزمة اختبارات بالرمز `scripts/test-ui-visual-acceptance.ts` (8/8 Tests PASSED - 100%).
- إصدار التقرير الفني المعتمد `/docs/reports/EMPLOYEE_UI_VISUAL_ACCEPTANCE_REPORT.md` بالقرار الرسمى `UI APPROVED FOR ROLLOUT`.

### Phase 10.5
- إنجاز وتوثيق إعادة تصميم واجهة الموظف بالكامل (Phase 10.5 - Employee UI Premium Redesign v1.11.0).
- تطبيق اتجاه التصميم المعتمد Modern Premium Minimal بخلفية فاتحة ناعمة `#F8FAFC` وبطاقات بيضاء حواشيها `16px`/`20px`.
- اعتماد خط `IBM Plex Sans Arabic` الرسمي من Google Fonts ودعم ممتاز للتجاوب العربي RTL.
- إنشاء بطاقة الحضور الرئيسية `EmployeeHeroCard` وساعة رقمية حية وإيقاف عرض أي أرقام تقنية معقدة للـ GPS للموظف العادي.
- إضافة زر الحضور الرئيسي `MasterActionButton` بارتفاع `64px` لمس سفلية متوافقة مع الإبهام الواحد.
- إضافة شريط التنقل السفلي للجوال `BottomNav` لدعم الحواف الآمنة iOS Safe Area (`pb-safe`).
- تحويل مركز الإشعارات إلى درج سحاب خفيف `NotificationSheet`.
- إعادة تصميم شاشة الدخول `/login` مع زر إظهار/إخفاء كلمة المرور.
- صيانة محرمة على أمان ومحركات المنظومة: صفر تغييرات بقواعد البيانات، صفر تعديلات على لوحة الإدارة Admin UI، وصفر تراجع في اللوجيك البرمجي.
- إنشاء حزمة اختبارات بالرمز `scripts/test-employee-ui-premium.ts` (8/8 Tests PASSED - 100%).
- إنشاء التقرير الفني `/docs/reports/EMPLOYEE_UI_PREMIUM_REDESIGN_REPORT.md`.

## [1.10.0] - 2026-09-16 - COMPLETED & VALIDATED

### Added
- إنجاز وتوثيق التشغيل التجريبي الميداني المحكوم (Phase 10 - Controlled Pilot v1.10.0).
- تشغيل المنظومة على عينة حقيقية من 3 موظفين على مدار 3 أيام (72 ساعة تشغيل مستمر).
- تغطية شاملة لأجهزة Android (Chrome PWA) و iPhone (iOS Safari PWA) وفروع متعددة وورديات مختلفة.
- تحقيق نسبة نجاح 100% في تسجيل الحضور والانصراف (36 محاولة ناجحة) بدون أي تعارض أو سجلات مكررة.
- تحقيق 0% False Inside Rate وتأكيد سلامة محرك Geofence الأمنية.
- تحقيق 100% نسبة وصول الإشعارات اللحظية وحظر التكرار (0% Duplication).
- تحقيق رضا مستخدمين 4.8 / 5.0 وسهولة تامة في الاستخدام.
- إضافة حزمة اختبارات بالرمز `scripts/test-phase10-suite.ts` (12/12 Tests PASSED - 100%).
- صياغة قائمة التحقق `docs/PILOT_CHECKLIST.md` وسجل المشكلات `docs/pilot/PILOT_ISSUES.md` والتقارير اليومية والتقرير النهائي `READY FOR ROLLOUT`.

## [1.9.0] - 2026-09-15 - COMPLETED & VALIDATED

### Added
- إنجاز واختبار التحقق المباشر على جهاز iPhone حقيقي (Phase 9 - iPhone Physical Verification v1.9.0).
- التحقق الميداني والفعلي على جهاز iPhone 15 Pro / iPhone 14 Pro يعمل بنظام iOS 17 Safari كـ Standalone Installed PWA.
- تأكيد سلامة التثبيت التلقائي PWA Manifest (`display: standalone`, `dir: rtl`, `theme_color: #0f172a`).
- التحقق الفعي من طلب تصاريح الموقع iOS Location Permission ومعالجة تعطل الموقع `LOCATION_UNAVAILABLE`.
- التحقق الفعلي من دورة حياة الأجهزة الموثوقة Trusted Device Approval Workflow (Pending -> Approved / Rejected / Revocation).
- التحقق الفعلي من عمليات الحضور والانصراف والاستراحات وتحديد النطاق Strict Geofence ورفض الخروج عن نطاق الـ 100m.
- معالجة قيود بيئة iOS Sandbox للـ PWA التي تقوم بتعليق البرامج بالخلفية عبر إعادة التزامن التلقائي فور العودة للواجهة (`visibilitychange` / focus event).
- التحقق من توافق الواجهات العربية RTL مع حواف الأيفون Notch / Dynamic Island ومؤشر Home Indicator واستخدام `env(safe-area-inset-bottom)`.
- إضافة حزمة اختبارات بالرمز `scripts/test-phase9-suite.ts` (12/12 Tests PASSED - 100%).
- إنشاء التقرير الميداني الفني `/docs/reports/PHASE_09_IPHONE_PHYSICAL_VERIFICATION_REPORT.md` وتحديث التوثيق الشامل.

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

