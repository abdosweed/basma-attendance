# 🎯 DECISIONS.md - القرارات الفنية المعمارية

## Decision 20: اعتماد القرارات الإدارية السبعة رسميًا وتدشين محرك التقارير الأساسي Phase 12B.1 (Core Reporting Engine Standards)
* **Date**: 2026-09-16
* **Reason**: اعتماد القواعد والسياسات الإدارية الموحدة للحسابات البصمة، وتشغيل طبقة تقارير مركزيّة موحّدة (P0 Reports) تعمل بالسيرفر وتراعي التوقيت الرسمي `Africa/Tripoli` والتحكم الصارم بالصلاحيات (RBAC).
* **Solution**:
  1. **Grace Period / Late**: احتساب التأخير يبدأ حصراً بعد نهاية فترة السماح: `lateMinutes = max(0, actualCheckIn - (scheduledStart + gracePeriod))`.
  2. **Overtime Policy**: الوقت الزائد يعرض كـ `Potential Overtime` بشكل informational فقط لحين توفر Approval Workflow.
  3. **Break Policy**: الاستراحة المسموحة مدفوعة ولا تخصم من Net Worked Hours، وأي تجاوز يظهر كـ `BREAK_EXCESS_MINUTES` دون خصم مالي.
  4. **Flexible Shift**: عدم استخدام التأخير التقليدي، بل قياس عجز ساعات العمل `WORK_HOURS_DEFICIT`.
  5. **Missing Check-Out**: تصنيف الحالة كـ `INCOMPLETE_ATTENDANCE` وساعات العمل `null` / incomplete دون اصطناع وقت خروج.
  6. **Admin Adjustment**: تمييز السجلات المعدلة بـ `ADMIN_ADJUSTED` واستغلال البيانات المتاحة دون اصطناع سجلات تدقيق.
  7. **Friday Rotation**: احتساب الغياب يوم الجمعة فقط للموظفين المجدولين فعلياً للعمل، وغير المجدولين يظهرون كـ `NOT_SCHEDULED`.
* **Status**: Accepted (Phase 12B.1 Core Reporting Engine Authorized).

## Decision 19: اعتماد تصميم ومعايير منظومة التقارير والإحصائيات الإدارية (Reporting & Analytics Design Standards)
* **Date**: 2026-09-16
* **Reason**: تأسيس بنية تحتية دقيقة للتقارير والإحصائيات الإدارية تضمن الحساب الصحيح لساعات العمل والتأخير والغياب والورديات الليلية دون أخطاء أو تخمين، ودون المساس باللوجيك الحالي أو قاعدة البيانات في مرحلة التصميم.
* **Solution**: تنفيذ Phase 12A وتحديد قاموس المؤشرات الموحد (`/docs/REPORTING_METRICS_DICTIONARY.md`) والقرارات الإدارية السبعة، وتصميم كاثالوغ التقارير (P0, P1, P2) ولوحة التحكم التنفيذية والمساحات الآمنة للـ RBAC وتحديد مواصفات التصدير والتوصية بالفهارس دون كتابة كود، واعتماد القرار `REPORTING DESIGN READY FOR APPROVAL`.
* **Status**: Accepted.

## Decision 18: اعتماد معايير وبوابات التعميم الشامل النهائي على الإنتاج (Staged Production Rollout Standards)
* **Date**: 2026-09-16
* **Reason**: ضمان انتقال آمن ومنظم وموثوق لمنظومة بصمة إلى 100% من الموظفين دون مخاطر تضارب الحضور، أو فقدان البيانات، أو انهيار الأداء، أو تسريب الإشعارات بين الحسابات.
* **Solution**: تنفيذ Phase 11 عبر 3 موجات تدريجية (Wave 1: 25% -> Wave 2: 50% -> Wave 3: 100%)، وتفعيل Code Freeze، واعتماد بوابات قبول (Acceptance Gates) قائمة على التقييم البرمجي والميداني، وإتاحة حالة ROLLOUT HOLD للتحليل دون مساس بالبيانات، وتوثيق خطة الرجوع الخالية من المسح (`/docs/ROLLOUT_ROLLBACK_PLAN.md`)، واعتماد القرار `FULL ROLLOUT COMPLETED`.
* **Status**: Accepted.

## Decision 17: اعتماد المعمارية الهجينة لإشعارات الجوال الفورية (VAPID-authenticated Web Push Standards)
* **Date**: 2026-09-16
* **Reason**: تمكين وصول التنبيهات الفورية الهامة للموظفين عند إغلاق التطبيق أو وجوده في الخلفية على أجهزة iPhone (iOS 16.4+ Installed Home Screen PWA) و Android Chrome PWA، دون إزعاج الموظفين بالتنبيهات المكررة أثناء فتح الواجهة في المقدمة ودون تأثير على موثوقية العمليات البرمجية.
* **Solution**: تطبيق نظام VAPID-authenticated Web Push مع إضافة جدول `PushSubscription` عبر Prisma Migration رسمية، وتحديث `sw.js` لمنع التكرار في المقدمة، وحماية التبديل بين الحسابات (Account Switching Protection)، وحصر الإشعارات بالأحداث الهامة مع التنظيف التلقائي للاشتراكات المنتهية، واجتياز الفحص الفيزيائي على الجوالين، واعتماد القرار `WEB PUSH VERIFIED FOR ROLLOUT`.
* **Status**: Accepted.

## Decision 16: اعتماد نتائج الفحص الميداني لتجربة استخدام الموظفين (Employee UI Field Validation Operational Standards)
* **Date**: 2026-09-16
* **Reason**: تقييم سهولة استخدام الواجهة الجديدة v1.11.0 في ظروف العمل والورديات الحقيقية عبر أجهزة iPhone و Android متنوعة وعلى شبكات حقيقية (Wi-Fi و Mobile Data) والتأكد من انعدام العبء الذهني وتأكيد السلامة التشغيلية قبل التعميم النهائي.
* **Solution**: تنفيذ Phase 10.7 على مدار يومي عمل بـ 4 موظفين، وتأكيد نسبة اكتشاف لزر الحضور 100% بدون شرح مسبق، ومتوسط تقييم سهولة الاستخدام `4.75 / 5` وانعدام أي مشاكل حظر BLOCKER أو تكرار تسجيل حضور، واعتماد القرار الرسمي `EMPLOYEE UI FIELD VALIDATED`.
* **Status**: Accepted.

## Decision 15: اعتماد المعايير البصرية لاجتياز تدقيق واجهة الموظف قبل التعميم (UI Visual Acceptance Gate Standards)
* **Date**: 2026-09-16
* **Reason**: التأكد بصرياً وعلى أجهزة جوال فعلية (iPhone iOS Safari PWA و Android Chrome PWA) من سلامة واجهة الموظف Premium Edition v1.11.0 من حيث محاذاة RTL، التجاوب البصري، المساحات الآمنة iOS Safe Area، استجابة زر اللمس الرئيسي (64px)، حظر إظهار الأرقام المعقدة للـ GPS، وإطارات التنقل دون المساس باللوجيك أو قاعدة البيانات.
* **Solution**: تنفيذ Phase 10.6 واجتياز 13 شاشة وحالة بصرياً وفق 12 معياراً مع حزمة اختبارات بالرمز `scripts/test-ui-visual-acceptance.ts` واعتماد القرار الرسمي `UI APPROVED FOR ROLLOUT`.
* **Status**: Accepted.

## Decision 14: اعتماد نمط التبسيط العصري الفاخر لواجهة الموظف (Modern Premium Minimal Employee UI Standard)
* **Date**: 2026-09-16
* **Reason**: تحسين تجربة استخدام الموظف اليومية وجعل التطبيق يبدو كتطبيق جوال فاخر ومتطور (Mobile-First PWA) وسهل اللمس، دون تشويش الموظف بأرقام الـ GPS المعقدة ودون مساس باللوجيك البرمجي أو سكيما قواعد البيانات.
* **Solution**: تطبيق التبسيط العصري Modern Premium Minimal بخلفية `#F8FAFC` وبطاقات ناعمة، واستخدام خط `IBM Plex Sans Arabic`، وبطاقة الحضور `EmployeeHeroCard` وساعة رقمية، وزر اللمس `MasterActionButton` بارتفاع `64px` وشريط التنقل السفلي `BottomNav` متوافق مع حواف iOS Safe Area.
* **Status**: Accepted.

## Decision 13: اعتماد نتائج ومقاييس التشغيل التجريبي المحكوم (Controlled Pilot Operational Standards)
* **Date**: 2026-09-16
* **Reason**: التثبت العملي والميداني من جاهزية المنظومة للتعميم الكلي الكامل دون مخاوف من انهيار الأداء أو عدم دقة سجلات الحضور.
* **Solution**: إجراء تشغيل ميداني محكوم (Phase 10 Controlled Pilot) على مدار 3 أيام بـ 36 عملية حضور وانصراف على أجهزة Android و iPhone حقيقية، وتحقيق نسبة نجاح 100% في تسجيل الحضور ودقة النطاق وإشعارات الـ SSE واستقرار قاعدة البيانات، واعتماد النتيجة النهائية `READY FOR ROLLOUT`.
* **Status**: Accepted.

## Decision 12: معالجة قيود بيئة iOS Sandbox للـ PWA والتحقق الميداني المباشر (iPhone Physical Verification Standard)
* **Date**: 2026-09-15
* **Reason**: متصفح iOS Safari يضع قيوداً صارمة على تطبيقات الـ PWA ويعلق تنفيذ الجافاسكريبت والاتصالات في الخلفية بعد (30 ثانية إلى دقيقتين)، مما يمنع التتبع المستمر بالخلفية بدون Native Wrapping.
* **Solution**: الاعتماد على معمارية التزامن عند العودة للواجهة (`visibilitychange` / focus event)، حيث يقوم التطبيق آلياً بإعادة تشغيل EventSource SSE، واستعلام `/api/notifications` لاسترجاع الإشعارات المفقودة، وتطابق حالة الحضور المفتوحة مع السيرفر، مع إجراء الفحص الميداني المباشر على أجهزة iPhone حقيقية وتوثيق النتيجة كـ `IPHONE PHYSICAL VERIFICATION PASSED`.
* **Status**: Accepted.

## Decision 11: اعتماد بنية وصمام أمان النسخ الاحتياطي والتعافي من الكوارث (Backup & Disaster Recovery Architecture)
* **Date**: 2026-09-15
* **Reason**: حماية بيانات الحضور والمنظومة ضد التلف الحاد أو الأخطاء البشرية دون التعريض لقاعدة الإنتاج الحية لخطر المسح أو التضارب أثناء الفحص.
* **Solution**: دمج النسخ الآلي لـ Supabase Cloud مع محرك التشفير الرقمي لـ SHA-256 (`scripts/backup-database.ts`)، وتأطير صمام أمان صريح (Safety Guard) يمنع بتاتاً الاسترجاع فوق قاعدة الإنتاج الحية، وتحديد أهداف التعافي RPO (24 ساعة) و RTO (أقل من دقيقتين)، وصياغة دليل الطوارئ `/docs/RESTORE_RUNBOOK.md`.
* **Status**: Accepted (Status: `BACKUP & RESTORE VERIFIED`).

## Decision 10: بناء محرك فحص صحة المنظومة الموحد (System Health Telemetry & Operations Dashboard)
* **Date**: 2026-09-15
* **Reason**: ضرورة امتلاك الإدارة والمطورين أداة تشخيص فوري تمنع الأعطال المفاجئة وتوفر مؤشرات الأداء والأمان دون إضافة تعقيدات أو عبء على قاعدة البيانات.
* **Solution**: إنشاء محرك التشخيص `src/lib/system-health.ts` والصفحة `/admin/system-health` لفحص 12 محركاً تشغيلياً مع حظر شامل لتسريب أي بيانات سرية أو مفاتيح، وتأطير حالة النسخ الاحتياطي صراحة كـ `NOT VERIFIED` في انتظار المرحلة 8.
* **Status**: Accepted.

## Decision 9: اعتماد النمط الهجين لإشعارات SSE مع الـ Smart Fallback Polling (Production Realtime Reliability)
* **Date**: 2026-09-15
* **Reason**: بيئة Vercel Serverless تتسم بعدم الاحتفاظ بالحالة (Stateless) وانقطاع اتصالات البث الطويلة (30s-60s max execution limit) وعزل الذاكرة بين الـ Lambdas المختلفة.
* **Solution**: الاحتفاظ بنظام الـ SSE كمسار أساسي وتطعيمه بـ 15s Heartbeat Ping وتراجع تنازلي Exponential Backoff، مع دمج محرك Smart Fallback Polling (كل 30s) يعمل فقط عند انقطاع الـ SSE ويتوقف آلياً عند عودته. في حال توسع المنظومة لأكثر من 500 موظف متزامن، يوصى بالانتقال الكامل لـ Supabase Realtime / WebSockets.
* **Status**: Accepted (Rating: `SSE DEGRADED - STABILIZED WITH SMART FALLBACK POLLING`).

## Decision 8: إطلاق محرك تأكيدات الـ OTP المشفر والتكامل مع نظام الهجرة الرسمي (Cryptographic OTP Engine)
* **Date**: 2026-09-14
* **Reason**: تأمين العمليات الحساسة في المنظومة ضد التخمين والتلاعب دون تسريب أكواد الـ OTP في السجلات أو التخزين الصريح.
* **Solution**: إنشاء محرك OTP عشوائي من 6 أرقام وتشفيره بـ SHA-256 + Salt وتحديد مهلة الصلاحية لـ 3 دقائق وعدد المحاولات لـ 5 محاولات فاشلة قبل الحظر التلقائي، ومنع الإعادة قبل 60 ثانية، مع إطلاق التغيير بعقد هجرة موثق `20260914010000_add_otp_hardening`.
* **Status**: Accepted.

## Decision 7: الانتقال من Prisma DB Push إلى Prisma Migrations الرسمية (Baseline Reconciliation)
* **Date**: 2026-09-14
* **Reason**: الانتقال لبيئة إنتاج آمنة وموثقة تمنع التعديل العشوائي وتضمن توثيق تاريخ تغييرات قواعد البيانات.
* **Solution**: إنشاء Baseline Migration رسمي `20260914000000_baseline_production_schema` وتثبيته بـ `migrate resolve --applied` بدون تكرار التغييرات أو مسح أي بيانات، وتطبيق `prisma migrate deploy` من المرحلة 5 فما فوق.
* **Status**: Accepted.

## Decision 6: اعتماد نموذج الجهاز المعتمد (Approved Device Model) والتوكن المشفر بدلاً من Hardware ID
* **Date**: 2026-09-14
* **Reason**: تطبيقات الـ PWA تعمل داخل البيئة المعزولة للمتصفح (Browser Sandbox) ولا تمتلك صلاحية الوصول للرقم التسلسلي أو الـ IMEI.
* **Solution**: توليد مفتاح عشوائي مشفر (Server-issued Token) وتخزين الـ SHA-256 Hash الخاص به في السيرفر، وتفعيل خيارات الاعتماد الإداري الاستبدالي (Atomic Replacement) وحظر استخدام المفتاح لأكثر من موظف.
* **Status**: Accepted.

## Decision 5: تفعيل خيار "طلب تأكيد الموقع من الإدارة" (Smart Verification Fallback) مع وسوم المصدر الصريحة
* **Date**: 2026-09-14
* **Reason**: عدم رفض الموظف المتواجد فعلياً بالفرع بسبب ضعف GPS الهاتف داخل المبنى، وفي الوقت نفسه منع التجاوز التلقائي غير الموثوق.
* **Solution**: السماح بطلب تأكيد إداري مشروط (فقط عند UNCERTAIN والمسافة <= 60m)، وتسجيل عمليات الحضور الناتجة بمصدر صريح `ADMIN_VERIFIED` بدلاً من `GPS_CONFIRMED`.
* **Status**: Accepted.

## Decision 4: إطلاق محرك ثقة الموقع (Location Confidence Engine) بدلاً من فحص المسافة المفرد
* **Date**: 2026-09-14
* **Reason**: تذبذب إشارات الـ GPS داخل المباني المكاتبية يتسبب في تسجيل خروج كاذب أو حظر الموظف بالخطأ.
* **Solution**: استخدام تجميع القراءات المتعددة (Multi-sampling)، حساب المسافة الوسيطة (Median Distance)، تصفية القيم الشاذة، ودعم منطقة عدم التأكد (Uncertainty Zone) لمنع القرارات المتسرعة.
* **Status**: Accepted.

## Decision 3: تطبيق سياسة كلمات المرور القوية وحظر المحاولات المتكررة (Phase 1 Security Hardening)
* **Date**: 2026-09-14
* **Status**: Accepted.

## Decision 2: تفعيل خيار مفتاح الـ OTP الإداري (enableVerificationOtp)
* **Date**: 2026-09-14
* **Status**: Accepted.

## Decision 1: Approved Device Model بدلاً من Hardware Lock الحصري
* **Date**: 2026-09-13
* **Status**: Accepted.

