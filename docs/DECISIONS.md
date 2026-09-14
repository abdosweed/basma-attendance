# 🎯 DECISIONS.md - القرارات الفنية المعمارية

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

