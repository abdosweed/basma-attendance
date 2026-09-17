# 📱 منظومة بصمة لإدارة الحضور والانصراف المؤسسي (Basma Enterprise Attendance System v2.0.0)

[![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22.0-2d3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)

نظام **بصمة (Basma Enterprise)** هو تطبيق ويب تقدمي (PWA) متكامل ومحرف تقنياً لإدارة الحضور والانصراف المؤسسي الجغرافي، معالجة الورديات والمرونة الزمنية، احتساب كشوفات الرواتب والأجروات، وتأمين عمليات التسجيل ضد كافة محاولات التلاعب بالموقع أو تبادل الأجهزة.

---

## 🌟 1. نظرة عامة على النظام (System Overview)

صُممت المنظومة لتلبية المتطلبات الهندسية والتشغيلية للمؤسسات والشركات، وتوفر تجربة استخدام سريعة وموثوقة كالتطبيقات الأصلية (Native PWA Experience) مع دعم كامل للغة العربية والاتجاه من اليمين إلى اليسار (RTL)، ومزامنة توقيت ليبيا الرسمي (`Africa/Tripoli` - UTC+2).

### 📐 حزمة التقنيات الأساسية (Tech Stack):
- **الواجهة الأمامية والإنتاج (Frontend Framework)**: [Next.js 14](https://nextjs.org/) (App Router, Server Components & Client Hooks).
- **لغة البرمجة (Language)**: [TypeScript 5](https://www.typescriptlang.org/) مع التزام كامل بفحص الأنواع الصارم (`strict type checking`).
- **التصميم ونظام الثيمات (Styling & Design System)**: [Tailwind CSS](https://tailwindcss.com/) مع دعم الثيم المزدوج الكامل (Light / Dark Mode Unification).
- **قاعدة البيانات والـ ORM**: [Prisma ORM](https://www.prisma.io/) على قاعدة بيانات PostgreSQL المدارة عبر [Supabase](https://supabase.com/).
- **محرك التقارير والتصدير (Export Engine)**: [ExcelJS](https://github.com/exceljs/exceljs) لتوليد كشوفات الرواتب والتقارير المالية بتنسيق `.xlsx` مع تنسيق ملون ومتوافق مع العربية.
- **التحديثات المباشرة (Real-Time)**: Server-Sent Events (SSE) وحقن إشعارات الـ Web Push للجوال والمتصفح.

---

## 🚀 2. البنية المعمارية والمراحل المكتملة (Phases 1-20 Architecture)

تتكون المنظومة من 20 مرحلة هندسية متكاملة تضمن أعلى مستويات الجودة والأمان:

| رقم المرحلة | المحور الهندي | الوصف الفني والتنفيذي |
| :--- | :--- | :--- |
| **Phase 1-3** | **نواة النظام والهوية** | إنشاء قاعدة البيانات، إدارة الموظفين، الفروع الجغرافية، والتحقق البصري التفاعلي. |
| **Phase 4-6** | **محرك الورديات والاستراحات** | دعم الورديات المرنة والمقسمة والليليّة، احتساب فترة السماح، وإدارة الاستراحات. |
| **Phase 7-9** | **أمان الأجهزة وتأكيد الـ OTP** | كود التأكيد المباشر، حظر الأجهزة غير المعتمدة، والبث المباشر للإشعارات SSE. |
| **Phase 10-12** | **إدارة الفروع والموقع الجغرافي** | التحكم بحرم الجغرافية (Geofence Radius) والتقاط الإحداثيات بدقة عالية. |
| **Phase 13** | **بوابة الإجازات والاستئذان** | تقديم طلبات الإجازات السنوية/المرضية والاستئذان الساعي مع حساب الأرصدة. |
| **Phase 14** | **مركز الاعتماد السريع للمدير** | واجهة موحدة لمركز اعتمادات الإدارة (`/admin/approvals`) لمعالجة كافة الطلبات. |
| **Phase 15** | **محرك التقارير والرواتب** | تصدير كشوفات الرواتب والساعات الإضافية والتأخيرات بصيغة Excel/CSV باللغة العربية. |
| **Phase 16** | **سجل التدقيق والمزامنة المحلية** | سجل التدقيق الشامل (`AuditLog`) ومحرك الحضور دون إنترنت (`Offline Sync`). |
| **Phase 17** | **درع مكافحة تزييف المواقع** | الحساب الرياضياتي الخادم (Haversine Guard) ومنع البصمة النيابية (`Anti-Buddy Punching`). |
| **Phase 18** | **المهام المجدولة والأتمتة** | أتمتة الإغلاق التلقائي (`AUTO_CLOSED`)، احتساب التأخير والغياب، وتصفيات الصيانة. |
| **Phase 19** | **صقل PWA وشارات الجوال** | تكامل App Badging API، محرك Haptic Feedback الاهتزازي، وحماية الـ Viewport. |
| **Phase 20** | **الإطلاق الإنتاجي v2.0.0** | التدقيق النهائي، ضبط HTTP Security Headers، فحص الأنواع الصارم، ووسم `v2.0.0`. |

---

## 🔐 3. دليل المتغيرات البيئية (Environment Variables Guide)

أنشئ ملف `.env` أو `.env.local` في جذر المشروع وأضف المتغيرات التالية:

```env
# قاعدة البيانات (Supabase PostgreSQL / Prisma)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public&pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"

# الربط ببيئة Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"

# الرمز السري للمهام المجدولة (Cron Endpoint Protection)
CRON_SECRET="basma_production_cron_secret_2026"

# التشفير والجلسات (JWT Session Security)
JWT_SECRET="super-secret-jwt-encryption-key-basma-2026"
NEXTAUTH_SECRET="super-secret-jwt-encryption-key-basma-2026"
```

> ⚠️ **ملاحظة أمنية**: تظل المتغيرات `DATABASE_URL` و `CRON_SECRET` و `SUPABASE_SERVICE_ROLE_KEY` محمية على مستوى خادم السيرفر فقط، ويمنع تسريبها للـ Client Bundle.

---

## ⚙️ 4. تشغيل المهام المجدولة (Cron Jobs Configuration)

تضم المنظومة 3 محركات أتمتة خلفية تعمل عبر مسارات `/api/cron/*` ومحمية بواسطة `CRON_SECRET`:

### 1. الإغلاق التلقائي للورديات المنسية (`/api/cron/auto-checkout`)
- **الوظيفة**: البحث عن السجلات المفتوحة وإغلاقها آلياً بنهاية الوردية بحالة `AUTO_CLOSED`.
- **الجدولة الموصى بها**: كل ساعة أو عند منتصف الليل (`0 * * * *`).

### 2. رصد الغياب وتثبيت التأخيرات اليومية (`/api/cron/daily-attendance-guard`)
- **الوظيفة**: احتساب دقائق التأخير الفعلي وتوليد سجلات غياب آلياً (`ABSENT`) للموظفين غير الحاضرين وبدون إجازات معتمدة.
- **الجدولة الموصى بها**: يومياً بعد انتهاء فترة سماح الحضور الصباحية (`0 11 * * *`).

### 3. الصيانة وتنظيف المؤقتات (`/api/cron/system-cleanup`)
- **الوظيفة**: أرشفة وتنظيف أكواد الـ OTP والرموز المنتهية القديمة لتحسين سرعة الاستعلامات.
- **الجدولة الموصى بها**: أسبوعياً أو عند منتصف كل ليلة (`0 2 * * *`).

#### 🔑 ترويسة الاستدعاء (Request Authorization Header):
```http
Authorization: Bearer basma_production_cron_secret_2026
```
أو عبر المعلمة:
```http
GET /api/cron/auto-checkout?secret=basma_production_cron_secret_2026
```

---

## 🛠️ 5. أوامر التشغيل والصيانة البرمجية (Commands Manual)

### 1. تثبيت الحزم والمكتبات:
```bash
npm install
```

### 2. تشغيل بيئة التطوير المحلية:
```bash
npm run dev
```

### 3. فحص الأنواع الصارم (TypeScript Check):
```bash
npx tsc --noEmit
```

### 4. اختبار وتوليد بناء الإنتاج (Production Build):
```bash
npm run build
```

### 5. تشغيل سيرفر الإنتاج:
```bash
npm start
```

---

## 🛡️ 6. الأمان والجاهزية التشغيلية (Enterprise Security & Compliance)

- **الحماية من الثغرات**: مجهزة برؤوس حماية HTTP مثل `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, و `Strict-Transport-Security`.
- **التحقق الجغرافي**: كشف تزييف الموقع على العميل والتأكيد الرياضياتي عبر Haversine بالخادم.
- **منع التشارك في الهواتف**: خوارزميات `Anti-Buddy Punching` لمنع تسجيل حضور موظفين متعددين من هاتف واحد.
- **جاهزية الإنتاج**: تم الإطلاق والوسم الرسمي بشرط `v2.0.0`.

---
**حقوق الملكية وتطوير المنظومة © 2026 Basma Enterprise Team. جميع الحقوق محفوظة.**
