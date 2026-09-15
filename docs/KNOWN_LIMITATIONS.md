# ⚠️ KNOWN_LIMITATIONS.md - القيود المعروفة للنظام

1. **GPS Indoor Accuracy**: إشارة الـ GPS داخل المباني الخرسانية المغلقة قد تكون ضعيفة وتصل دقتها إلى 50-80 متراً.
2. **PWA Background GPS on iOS**: نظام iOS يضع قيوداً صارمة على التتبع الجغرافي في الخلفية لتطبيقات الـ PWA بدون Native App Wrapping.
3. **Browser Data Clearing**: عند قيام الموظف بتصفير بيانات المتصفح بالكامل، سيحتاج لإعادة اقتران الجهاز من قبل المسؤول.
4. **OTP External Delivery Provider (DELIVERY PROVIDER NOT CONFIGURED)**: 
   - **Status**: KNOWN LIMITATION / PENDING INTEGRATION (ليس خطأً أو Bug Critical).
   - **الوصف**: محرك الـ OTP المشفّر وحمايته الأمنية مبنيان ومفعلان بالكامل (`OTP Engine implemented` & `OTP security validated`). ولكن موفر الخدمة الخارجي للرسائل النصية/البريد (External SMS/Email Delivery Provider) غير مهيأ حالياً.
5. **Vercel Serverless SSE Memory Isolation**:
   - **Status**: MITIGATED WITH HYBRID FALLBACK ENGINE.
   - **الوصف**: بيئة Vercel Serverless تفصل ذاكرة الـ Lambdas المتعددة ومحدودة بـ 30-60 ثانية لجمود الاتصال.
   - **الحل المطبق**: تفعيل نبضات القلب Ping كل 15 ثانية، والدمج الذكي مع الـ Fallback Polling (كل 30 ثانية عند انقطاع SSE) لضمان عدم ضياع أي إشعار.
6. **Backup & Restore Verification Status**:
   - **Status**: NOT VERIFIED (PENDING PHASE 8).
   - **الوصف**: حالة النسخ الاحتياطي معروضة صراحة بـ NOT VERIFIED في شاشة صحة المنظومة في انتظار الفحص والتوثيق الميداني الشامل المخصص في المرحلة 8 Phase 8.
