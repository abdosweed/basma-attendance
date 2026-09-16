# ⚠️ KNOWN_LIMITATIONS.md - القيود المعروفة للنظام

1. **GPS Indoor Accuracy**: إشارة الـ GPS داخل المباني الخرسانية المغلقة قد تكون ضعيفة وتصل دقتها إلى 50-80 متراً.
2. **PWA Background GPS & Execution on iOS**:
   - **Status**: VERIFIED ON PHYSICAL DEVICE (v1.9.0).
   - **الوصف**: نظام iOS يضع قيوداً صارمة ويقوم بتعليق تطبيقات PWA بالخلفية بعد (30 ثانية - دقيقتين). تم اختبار ومعالجة هذا السلوك عبر التزامن التلقائي فور عودة التطبيق للواجهة Foreground حيث يعاد تشغيل اتصالات SSE وتحديث السجلات والإشعارات غير المقروءة.
3. **Browser Data Clearing**: عند قيام الموظف بتصفير بيانات المتصفح بالكامل، سيحتاج لإعادة اقتران الجهاز من قبل المسؤول.
4. **OTP External Delivery Provider (DELIVERY PROVIDER NOT CONFIGURED)**: 
   - **Status**: KNOWN LIMITATION / PENDING INTEGRATION (ليس خطأً أو Bug Critical).
   - **الوصف**: محرك الـ OTP المشفّر وحمايته الأمنية مبنيان ومفعلان بالكامل (`OTP Engine implemented` & `OTP security validated`). ولكن موفر الخدمة الخارجي للرسائل النصية/البريد (External SMS/Email Delivery Provider) غير مهيأ حالياً (يتم الاعتماد على طبقة الإشعارات الداخلية).
5. **Vercel Serverless SSE Memory Isolation**:
   - **Status**: MITIGATED WITH HYBRID FALLBACK ENGINE.
   - **الوصف**: بيئة Vercel Serverless تفصل ذاكرة الـ Lambdas المتعددة ومحدودة بـ 30-60 ثانية لجمود الاتصال.
   - **الحل المطبق**: تفعيل نبضات القلب Ping كل 15 ثانية، والدمج الذكي مع الـ Fallback Polling (كل 30 ثانية عند انقطاع SSE) لضمان عدم ضياع أي إشعار.
6. **Backup & Restore Verification Status**:
   - **Status**: VERIFIED (v1.8.0).
   - **الوصف**: تم فحص واختبار النسخ الاحتياطي واستعادة البيانات بنجاح تام على بيئة معزولة بأمان 100% ودون أي مساس بقاعدة البيانات الحية (RTO < 2m, RPO 24h, SHA-256 Verified).
