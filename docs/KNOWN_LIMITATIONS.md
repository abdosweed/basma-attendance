# ⚠️ KNOWN_LIMITATIONS.md - القيود المعروفة للنظام

1. **GPS Indoor Accuracy**: إشارة الـ GPS داخل المباني الخرسانية المغلقة قد تكون ضعيفة وتصل دقتها إلى 50-80 متراً.
2. **PWA Background GPS on iOS**: نظام iOS يضع قيوداً صارمة على التتبع الجغرافي في الخلفية لتطبيقات الـ PWA بدون Native App Wrapping.
3. **Browser Data Clearing**: عند قيام الموظف بتصفير بيانات المتصفح بالكامل، سيحتاج لإعادة اقتران الجهاز من قبل المسؤول.
4. **OTP External Delivery Provider (DELIVERY PROVIDER NOT CONFIGURED)**: 
   - **Status**: KNOWN LIMITATION / PENDING INTEGRATION (ليس خطأً أو Bug Critical).
   - **الوصف**: محرك الـ OTP المشفّر وحمايته الأمنية مبنيان ومفعلان بالكامل (`OTP Engine implemented` & `OTP security validated`). ولكن موفر الخدمة الخارجي للرسائل النصية/البريد (External SMS/Email Delivery Provider) غير مهيأ حالياً.
   - **الحل الحالي**: يتم استخدام طبقة الإشعارات الداخلية (`Internal Notification Layer`) لتسليم الأكواد.
