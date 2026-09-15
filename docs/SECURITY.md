# 🛡️ SECURITY.md - التوثيق الأمني

## 1. Authentication & Password Policy
- **Hashing**: bcrypt مع salt round = 10.
- **Password Policy**: أدنى حد 8 خانات، تشمل حرفاً كبيراً، حرفاً صغيراً، ورقماً.
- **Login Lockout**: حظر الحساب لمدة 15 دقيقة بعد 5 محاولات دخول فاشلة متتالية.
- **First Login Reset**: دعم حقل mustChangePassword لإجبار التغيير عند أول تسجيل دخول.

## 2. Session Management
- HTTP-Only JWT Cookies (asma_session_token) محصنة بصلاحية 7 أيام.
- إمكانية تسجيل الخروج من كافة الأجهزة (Revoke all sessions).

## 3. OTP Verification Security
- كود مكون من 6 أرقام ينتهي خلال دقيقتين.
- حد أقصى 3 محاولات خاطئة قبل إبطال الكود.
- لا يتم تسريب الكود في السجلات المفتوحة (Logs).

## 5. System Health Dashboard & Diagnostics Security
- **RBAC**: حماية مسار الصفحة `/admin/system-health` والـ API `/api/admin/system-health` بشرط صريح `SUPER_ADMIN` أو `ADMIN` مع حظر `EMPLOYEE` بـ HTTP 403 Forbidden.
- **Zero Secrets Exposure**: حظر وتصفية مخرجات التشخيص من أي كلمات مرور، مفاتيح JWT، أكواد OTP، أو سلاسل اتصال `DATABASE_URL`.


