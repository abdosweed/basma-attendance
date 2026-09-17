# التقرير الهيكلي والتحليلي الشامل لتصميم واجهات وتجربة المستخدم (UI/UX Audit)
## مشروع بصمة للحضور والانصراف المؤسسي (Basma Attendance System v2.0.0)

> **تنبيه توثيقي مسبق:** هذا التقرير يصف ويحلل **الوضع الحالي الفعلي** لمنظومة بصمة بدون أي تعديل أو اقتراح تحسينات أو تغيير في الأكواد أو القواعد المعمارية، ويهدف لتوفير مرجع كامل ومفصل بنسبة 100% لإجراء مراجعة شاملة لتجربة المستخدم (UI/UX Review).

---

## 1. قائمة جميع الشاشات (Screen Catalog)

| اسم الشاشة | المسار (Route) | نوع المستخدم | الغرض الأساسي | أهم المكونات الفاعلة | نوع التجاوب (Responsiveness) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **لوحة الحضور والبصمة الرئيسية** | `/` | Employee, Manager, Admin, Super Admin | تسجيل الحضور والانصراف، البدء والإنهاء للاستراحات، متابعة ملخص الدوم اليومي والطلبات. | `EmployeeHeroCard`, `AttendanceActionCard`, `PushNotificationManager`, `BottomNav`, Modals (`LeaveRequestModal`, `HourlyPermissionModal`, `CorrectionRequestModal`) | Fully Responsive (Mobile PWA First) |
| **تسجيل الدخول والتوثيق** | `/login` | جميع المستخدمين | المصادقة عبر الرقم الوظيفي/البريد وكلمة المرور أو رمز OTP والتأكد من اعتماد الجهاز. | نموذج Login, حقل الإدخال, زر الدخول, خيار OTP | Fully Responsive (Centered Card) |
| **الملف الشخصي والحساب** | `/profile` | جميع المستخدمين | عرض بيانات الموظف الشخصية، الفرع، الوردية، الأجهزة المعتمدة، وتغيير كلمة المرور. | بطاقة الموظف, قائمة الأجهزة, نموذج تغيير كلمة المرور, `BottomNav` | Fully Responsive |
| **لوحة التحكم الإدارية المركزية** | `/admin` | Admin, Super Admin, HR, Manager | الإدارة المركزية: متابعة البصمات الحية، إدارة الموظفين، الفروع، السجلات، والإعدادات. | `Navbar`, 5 التبويبات الرئيسية (`LiveActivity`, `EmployeesTab`, `BranchesTab`, `AuditLogTab`, `SystemSettingsTab`), `PayrollReportsTab`, Modals | Fully Responsive (Optimized Desktop Layout) |
| **مركز الاعتمادات والطلبات** | `/admin/approvals` | Admin, Super Admin, HR, Manager | معالجة واعتماد أو رفض طلبات الإجازات، الاستئذانات، وتصحيح البصمات. | `Navbar`, شريط الفلاتر, تغذية بطاقات الطلبات, نافذة الرفض المنبثقة | Fully Responsive |
| **إدارة الورديات والجداول** | `/admin/shifts` | Admin, Super Admin, HR | إنشاء وتعديل الورديات، تحديد ساعات العمل والاستراحات، وتكليف الموظفين بالورديات. | `Navbar`, بطاقات الورديات, جدول تعيين الورديات, نافذة إضافة/تعديل وردية | Fully Responsive |
| **إدارة الأجهزة المعتمدة** | `/admin/devices` | Admin, Super Admin | اعتماد الأجهزة الجديدة، إلغاء الاعتماد، حظر الأجهزة المشبوهة، وإعادة ضبط التوثيق. | `Navbar`, بطاقات إحصائيات الأجهزة, جدول الأجهزة, نافذة تفاصيل الجهاز | Fully Responsive |
| **إدارة المهام الميدانية** | `/admin/tasks` | Admin, Super Admin, Manager | إنشاء المهام وتكليف الموظفين بها ومتابعة نسبة الإنجاز والمهام المكتملة. | `Navbar`, كروت KPI للمهام, تغذية المهام, نافذة إنشاء مهمة جديدة | Fully Responsive |
| **التقرير اللحظي اليومي** | `/admin/reports/today` | Admin, Super Admin, HR | تقرير تفصيلي لحظي لحضور اليوم مع إمكانية الفلترة والتصدير الممتاز لإكسل. | `Navbar`, `ReportFilterBar`, `ReportTable`, أزرار التصدير | Fully Responsive (Horizontal Scroll Table on Mobile) |
| **صحة النظام والفحص الذاتي** | `/admin/system-health` | Super Admin, Admin | تشخيص صحة قاعدة البيانات، الاتصال بالبصمة، الخدمات السحابية، والوظائف المجدولة. | `Navbar`, بطاقات Diagnostic, زر تشغيل الفحص, قائمة التنبيهات | Fully Responsive |
| **مفتش سجلات التدقيق العميق** | `/admin/audit-log` | Super Admin, Admin | تتبع دقيق لكافة العمليات والأحداث الأمنية والإدارية في المنظومة مع معاين البيانات. | `Navbar`, محرك البحث والفلاتر, جدول السجلات, مفتش البيانات JSON | Fully Responsive |
| **شاشة الأجهزة (العرض البديل)** | `/dashboard/admin/devices` | Admin, Super Admin | واجهة مستقلة مخصصة لمراقبة واعتماد أجهزة البصمة PWA مع فلاتر سريعة. | `Navbar`, شبكة كروت الأجهزة, جدول الاعتماد السريع | Fully Responsive |
| **شاشة الورديات (العرض البديل)** | `/dashboard/admin/shifts` | Admin, Super Admin | واجهة مبسطة لاستعراض وتخصيص الورديات والدوامات للموظفين. | `Navbar`, جدول الورديات المبسط, نافذة التكليف | Fully Responsive |

---

## 2. وصف تفصيلي لكل شاشة (Detailed Screen-by-Screen UI/UX Analysis)

### 1. شاشة البصمة والدوام الرئيسية (Employee Home Dashboard)
- **Route:** `/`
- **نوع المستخدم:** Employee, Manager, Admin, Super Admin
- **الوصف الهيكلي (من الأعلى إلى الأسفل):**
  - **Header:** شريط علوي يثبت `Navbar` يحتوي على شعار "بصمة v2.0.0", اسم المنظومة، التنبيهات، وزر الوصول السريع.
  - **Banner PWA / Soft Prompt:** كرت تنبيه إرشادي لطيف بتصميم إمرلدي فاتح (`bg-emerald-50/90 border border-emerald-200`) لتشجيع الموظف على تفعيل إشعارات PWA.
  - **Employee Hero Card (`EmployeeHeroCard`):** كرت ترحيبي بالموظف يعرض الصورة الشخصية/الرمزية، الاسم الكامل، المسمى الوظيفي، اسم الفرع، اسم الوردية الحالية، والمنطقة الزمنية (`Africa/Tripoli`).
  - **Attendance Action Card (`AttendanceActionCard`):** الكرت المركزي التفاعلي لحالة البصمة:
    - **زر البصمة الرئيسي (Master Button):** زر دائري ضخم نباض (Pulse animation) بحجم 44×44 يتغير لونه وحالته:
      - **تسجيل حضور:** لون أخضر إمرلدي (`from-emerald-500 to-teal-600`) مع أيقونة Fingerprint ونقاط إشعاعية.
      - **تسجيل انصراف:** لون أزرق سماوي/بنفسجي (`from-sky-500 to-indigo-600`) عند اكتمال الدوام.
      - **معطل / خارج النطاق:** لون رمادي/أحمر خفيف عند وجود مخالفة جغرافية أو عدم اعتماد الجهاز.
    - **أزرار الاستراحة (Break Controls):** زرين لبدء الاستراحة وإنهاء الاستراحة تظهر عند تسجيل الحضور.
    - **مؤشر الموقع الجغرافي (Geofence Indicator):** شريط سفلي يوضح حالة الـ GPS والبعد عن الفرع بالأمتار (مثال: "داخل نطاق الفرع (12م)").
  - **Quick Action Bar:** 3 أزرار سريعة شفافة لفتح النوافذ المنبثقة:
    - طلب إجازة (`LeaveRequestModal`)
    - طلب استئذان ساعي (`HourlyPermissionModal`)
    - طلب تصحيح بصمة (`CorrectionRequestModal`)
  - **Recent Activity Feed:** قائمة سفلية بأحدث البصمات المسجلة اليوم مع الوقت والدقة الجغرافية.
  - **Bottom Navigation (`BottomNav`):** شريط تنقل سفلي ثابت للهواتف المحمولة يضم (الرئيسية، الطلبات، التنبيهات، الملف الشخصي).
- **أهم النصوص:** "أهلاً بك"، "تسجيل الحضور الآن"، "تسجيل الانصراف"، "بدء الاستراحة"، "إنهاء الاستراحة"، "داخل النطاق الجغرافي".
- **الألوان:** أخضر إمرلدي (`#059669`), أزرق سماوي (`#0284c7`), أصفر أمبر (`#d97706`), خلفية رمادية فاتحة جداً (`#f8fafc`).
- **تنسيق الأرقام والوقت:** التوقيت بصيغة 12 ساعة مع AM/PM باللغة العربية (مثال: `08:30 ص`) والتاريخ بصيغة `YYYY/MM/DD`.

---

### 2. شاشة تسجيل الدخول والتوثيق (Login Screen)
- **Route:** `/login`
- **نوع المستخدم:** جميع المستخدمين
- **الوصف الهيكلي:**
  - **Container:** بطاقة مركزية بيضاء متجاوبة وسط خلفية تدرجية ناعمة من الأزرق الفاتح إلى الرمادي.
  - **Header:** شعار بصمة البارز مع عنوان "تسجيل الدخول إلى نظام بصمة" ونص فرعي إرشادي.
  - **Form Fields:**
    - حقل الرقم الوظيفي / البريد الإلكتروني مع أيقونة `User` أو `Mail`.
    - حقل كلمة المرور مع زر إظهار/إخفاء كلمة المرور.
    - حقل اختيار النمط (كلمة المرور أو رمز OTP السريع).
    - حقل رمز OTP (يظهر عند اختيار نمط الدخول السريع عبر الموبايل).
  - **Action Button:** زر رئيسي عريض `bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl` بنص "تسجيل الدخول".
  - **Device Trust Warning:** تنبيه سفلي موضح إذا كان الجهاز الحالي غير معتمد ويحتاج موافقة الإدارة.
- **الحالات:** Loading (تحويل الزر لـ "جاري التحقق..."), Error (تنبيه أحمر أعلى النموذج عند خطأ البيانات).

---

### 3. شاشة الملف الشخصي (Profile Screen)
- **Route:** `/profile`
- **نوع المستخدم:** جميع المستخدمين
- **الوصف الهيكلي:**
  - **Profile Avatar Header:** دائرية شخصية كبيرة تحتوي أول حرفين من الاسم أو الصورة، متبوعة باسم الموظف الكامل ورتبته.
  - **Personal & Job Information Card:** بطاقة مقسمة إلى شبكة تضم: الرقم الوظيفي، البريد الإلكتروني، رقم الهاتف، اسم الفرع الرئيسي، الوردية المخصصة، ورصيد الإجازات المتبقي.
  - **Trusted Devices List:** قائمة بكل الأجهزة التي سجل منها الموظف دخولاً مع إشارة الجهاز الحالي وحالة الاعتماد (معتمد 🟢 / قيد الانتظار 🟡).
  - **Change Password Card:** نموذج آمن لتغيير كلمة المرور يحوي حقول كلمة المرور الحالية، كلمة المرور الجديدة، وتأكيد كلمة المرور.
  - **Bottom Navigation:** مثبت في أسفل الشاشة للهواتف.

---

### 4. لوحة التحكم الإدارية المركزية (Admin Dashboard)
- **Route:** `/admin`
- **نوع المستخدم:** Admin, Super Admin, HR, Manager
- **الوصف الهيكلي:**
  - **Top Navigation Bar (`Navbar`):** شريط علوي إداري كامل يضم الشعار، التبويبات السريعة، الإشعارات الحية عبر SSE، وبيانات الإداري المسجل.
  - **Dashboard Tabs Bar:** شريط تبويبات أفقي مرن يضم 5 قطاعات رئيسية:
    1. **النشاط المباشر (Live Activity Tab):**
       - بطاقات KPI علوية (إجمالي الموظفين، الحاضرون الآن، المتأخرون، الغائبون، المخالفات الجغرافية).
       - جدول الموظفين الحي في هذه اللحظة مع مؤشر النطاق الجغرافي وحالة الدوام.
    2. **إدارة الفريق والموظفين (Employees Tab):**
       - شريط بحث وفلترة حسب الفرع والوردية والحالة.
       - زر إضافة موظف جديد (`AddEmployeeModal`) وزر استيراد إكسل (`ImportEmployeesModal`).
       - جدول الموظفين الشامل مع خيارات (تعديل بيانات `EditEmployeeModal`, حظر، إعادة ضبط كلمة المرور).
    3. **الهيكلية والفروع (Structure & Branches Tab):**
       - بطاقات الفروع المعتمدة مع إحداثيات GPS ونصف قطر الجيوفينس (Geofence Radius).
       - زر إضافة فرع وتحديد موقعه عبر الخريطة التفاعلية (`BranchLocationPickerModal`).
    4. **سجل التدقيق للأدمن (Audit Log Tab):**
       - جدول العمليات السريعة المنفذة إدارياً.
    5. **الإعدادات المركزية وسياسات الجغرافيا (`SystemSettingsTab`):**
       - بطاقة فاتحة عالية التباين تحتوي على نماذج إعدادات الساعات المسموحة للتأخير، مسافة الجيوفينس الافتراضية، تفعيل/تعطيل الـ OTP، وإعدادات البصمة.
  - **قسم تقارير الرواتب المدمج (`PayrollReportsTab`):** جدول مالي وتفصيلي لحساب الساعات الإجمالية، التأخيرات، الخصومات، وصافي مستحقات الحضور.

---

### 5. مركز الاعتمادات والطلبات (Approvals Management)
- **Route:** `/admin/approvals`
- **نوع المستخدم:** Admin, Super Admin, HR, Manager
- **الوصف الهيكلي:**
  - **Page Header:** عنوان الشاشة "مركز اعتمادات الطلبات" مع ملخص كروت الطلبات المعلقة (`Pending Requests Count`).
  - **Filter Bar:** أزرار تصفية (الكل، طلبات الإجازات، الاستئذانات الساعية، تصحيح البصمات) مع محرك بحث بالاسم.
  - **Request Cards Grid / Feed:** بطاقات بيضاء مقسمة بنقاء تضم:
    - اسم الموظف والفرع وصورته الرمزية.
    - نوع الطلب مع شارة ملونة (إجازة 🔵 / استئذان 🟣 / تصحيح بصمة 🟠).
    - تفاصيل الطلب (السبب، التاريخ، من الساعة إلى الساعة).
    - المرفقات (إن وجدت).
    - **أزرار اتخاذ القرار:** زر اعتماد الأخضر (`bg-emerald-600 hover:bg-emerald-700 text-white`) وزر رفض الأحمر (`bg-rose-600 hover:bg-rose-700 text-white`).
  - **Rejection Reason Modal:** نافذة منبثقة عند الضغط على زر الرفض لإدخال سبب الرفض الإلزامي للموظف.

---

### 6. إدارة الورديات والجداول (Shifts Management)
- **Route:** `/admin/shifts`
- **نوع المستخدم:** Admin, Super Admin, HR
- **الوصف الهيكلي:**
  - **Header:** "إدارة الورديات وساعات العمل" مع زر إنشاء وردية جديدة (`bg-sky-600 hover:bg-sky-700 text-white`).
  - **Shifts Grid:** بطاقات بيضاء كلاسيكية للورديات المعرفة في النظام (مثل: الوردية الصباحية، الوردية المسائية، وردية الحراسة).
    - تفاصيل الكرت: وقت بدء الحضور، وقت الانصراف، مدة السماح بالتأخير بالدقائق، أيام العمل الأسبوعية، وعدد الموظفين المرتبطين بها.
  - **Shift Assignment Table:** جدول سفلي يربط الموظفين بالورديات مع إمكانية التعيين الجماعي.
  - **Shift Form Modal:** نافذة منبثقة لإضافة/تعديل وردية تشمل اختيار الأيام وتحديد الساعات بدقة.

---

### 7. إدارة الأجهزة المعتمدة (Devices Management)
- **Route:** `/admin/devices`
- **نوع المستخدم:** Admin, Super Admin
- **الوصف الهيكلي:**
  - **Header & Metrics:** "إدارة الأجهزة وبصمات الـ PWA" مع 4 بطاقات KPI (إجمالي الأجهزة، الأجهزة المعتمدة 🟢، قيد الانتظار 🟡، الأجهزة المحظورة 🔴).
  - **Devices Table:** جدول استعراض الأجهزة مع التفاصيل التقنية: الموظف المالك، نوع المتصفح والنظام (User Agent)، المعرف الفريد للـ PWA، تاريخ أول تسجيل، وحالة التوثيق.
  - **Action Menu:** أزرار سريعة لكل جهاز (اعتماد الفوري، إلغاء الاعتماد، حظر الجهاز النهائي، وإعادة مسح التوثيق).

---

### 8. إدارة المهام الميدانية (Task Management)
- **Route:** `/admin/tasks`
- **نوع المستخدم:** Admin, Super Admin, Manager
- **الوصف الهيكلي:**
  - **Header:** "إدارة وتكليف المهام الميدانية" مع زر "إضافة مهمة جديدة".
  - **KPI Cards:** إجمالي المهام، المهام قيد التنفيذ، المهام المكتملة، المهام المتأخرة.
  - **Task Cards List:** قائمة بيضاء بالمهام تحتوي على عنوان المهمة، الموظف المكلف، تاريخ التسليم، شارة الأولوية (عالية 🔴 / متوسطة 🟡 / منخفضة 🟢)، ونسبة الإنجاز.
  - **Create Task Modal:** نافذة اختيار الموظف وتحديد تفاصيل المهمة وتاريخ الاستحقاق.

---

### 9. التقرير اللحظي اليومي (Daily Live Report)
- **Route:** `/admin/reports/today`
- **نوع المستخدم:** Admin, Super Admin, HR
- **الوصف الهيكلي:**
  - **Header:** "التقرير اللحظي اليومي للحضور والانصراف" مع أزرار تصدير ملفات Excel و PDF.
  - **Report Filter Bar (`ReportFilterBar`):** فلترة مخصصة حسب التاريخ، الفرع، الوردية، وحالة الحضور (حاضر، متأخر، غائب، في استراحة).
  - **Report Table (`ReportTable`):** جدول تفصيلي تفاعلي يدعم الترتيب والبحث، يظهر وقت الحضور، وقت الانصراف، إجمالي ساعات العمل، التأخير بالدقائق، وحالة البصمة الجغرافية.

---

### 10. صحة النظام والفحص الذاتي (System Health Dashboard)
- **Route:** `/admin/system-health`
- **نوع المستخدم:** Super Admin, Admin
- **الوصف الهيكلي:**
  - **Header:** "مركز تشخيص وسرعة النظام" مع زر "إعادة تشغيل الفحص الذاتي الان".
  - **Health Grid:** بطاقات فحص حالة الخدمات:
    - اتصال قاعدة البيانات PostgreSQL / Supabase
    - حالة محرك الأتمتة والمهام المجدولة (Cron Jobs)
    - حالة الإشعارات الفورية Push Notifications
    - حالة البصمات الجغرافية والخدمات السحابية
  - **Log Console:** سجل قراءة الأخطاء البرمجية اللحظية وحالة الذاكرة والاستجابة بالمللي ثانية (ms).

---

### 11. مفتش سجلات التدقيق العميق (Deep Audit Log Inspector)
- **Route:** `/admin/audit-log`
- **نوع المستخدم:** Super Admin, Admin
- **الوصف الهيكلي:**
  - **Header:** "سجل التدقيق والأمان المؤسسي".
  - **Filters & Search:** فلترة حسب مسؤولي النظام، نوع العملية (إنشاء، تعديل، حذف، دخول)، والفترة الزمنية.
  - **Audit Table:** جدول يعرض منفذ العملية، نَص الحركة، عنوان الـ IP، والتاريخ والوقت بالتفصيل.
  - **JSON Diff Viewer:** مربع رمادي فاتح مونو (`bg-slate-50 border border-slate-200 font-mono`) ينبثق عند النقر لمعاينة البيانات قبل وبعد التعديل (Old Value vs New Value).

---

### 12 & 13. شاشات العرض البديل للأجهزة والورديات
- **Routes:** `/dashboard/admin/devices` & `/dashboard/admin/shifts`
- **نوع المستخدم:** Admin, Super Admin
- **الوصف الهيكلي:** واجهات عريضة مستقلة مبسطة توفر وصولاً سريعاً لشبكات كروت الأجهزة والورديات بدون التبويبات المعقدة، مخصصة للشاشات الضخمة والشاشات اللمسية.

---

## 3. الإجراءات المتاحة في كل شاشة (Available User Actions Matrix)

| الشاشة | الإجراءات المتاحة للمستخدم |
| :--- | :--- |
| **لوحة الحضور (`/`)** | تسجيل حضور جغرافي، تسجيل انصراف جغرافي، بدء استراحة، إنهاء استراحة، تقديم طلب إجازة، تقديم طلب استئذان ساعي، تقديم طلب تصحيح بصمة، تفعيل إشعارات PWA. |
| **تسجيل الدخول (`/login`)** | إدخال الرقم الوظيفي/البريد، إدخال كلمة المرور، طلب رمز OTP، إدخال رمز OTP للتحقق، تبديل طريقة التوثيق. |
| **الملف الشخصي (`/profile`)** | استعراض البيانات الشخصية والوظيفية، استعراض قائمة الأجهزة المعتمدة، تغيير كلمة المرور، تسجيل الخروج. |
| **لوحة التحكم (`/admin`)** | فلترة الموظفين، إضافة موظف جديد، تعديل بيانات موظف، حظر موظف، إضافة فرع جديد، تحديد موقع الفرع على الخريطة، تعديل إعدادات النظام والجيوفينس، تصدير تقارير الرواتب. |
| **الاعتمادات (`/admin/approvals`)** | تصفية الطلبات حسب النوع، بحث بالاسم، قبول/اعتماد طلب الإجازة أو الاستئذان أو التصحيح، رفض الطلب مع إدخال السبب الإلزامي. |
| **الورديات (`/admin/shifts`)** | إضافة وردية جديدة، تعديل الوردية، تحديد مدة التأخير والاستراحات، ربط الموظفين بالورديات، حذف الوردية. |
| **الأجهزة (`/admin/devices`)** | البحث في الأجهزة، تصفية حسب حالة الاعتماد، اعتماد جهاز جديد، إلغاء اعتماد جهاز، حظر جهاز بشكل دائم، مسح توثيق الجهاز. |
| **المهام (`/admin/tasks`)** | إنشاء مهمة جديدة وتكليف موظف بها، تحديث نسبة الإنجاز، تغيير أولوية المهمة، إغلاق المهمة المكتملة. |
| **التقرير اليومي (`/admin/reports/today`)** | تصفية التقارير حسب الفرع والوردية والحالة والتاريخ، الترتيب حسب الأعمدة، تصدير التقرير المباشر لملف Excel. |
| **صحة النظام (`/admin/system-health`)** | تنفيذ الفحص التشخيصي المباشر، استعراض استجابة قاعدة البيانات والخدمات، معاينة سجلات النظام. |
| **سجل التدقيق (`/admin/audit-log`)** | تصفية سجلات الأحداث، البحث بالنص، توسيع واستعراض الفروقات الفنية (JSON Diffs) للعمليات. |

---

## 4. الحالات المختلفة للواجهات (UI State Variations & Edge Cases)

### أ. حالات النظام الشاملة (System States)
1. **وجود بيانات (Data Present):** عرض الجداول والبطاقات وشبكات الـ KPI ممتلئة بالبيانات الحقيقية مع خيارات الترتيب والفلترة.
2. **عدم وجود بيانات (Empty State):** أيقونة توضيحية باهتة وسط البطاقة مع نص عربي واضح (مثل: "لا توجد طلبات معلقة حالياً" أو "لا توجد أجهزة قيد الانتظار") وزر إجراء سريع لتنشيط العملية.
3. **حالة التحميل (Loading State):** استخدم هيكل Skeleton ذكي (`skeleton.tsx`) أو مؤشر تحريك دائري (Spinner) بنص "جاري تحميل البيانات...".
4. **حالة الخطأ (Error State):** تنبيه أحمر عريض (`bg-rose-50 border border-rose-200 text-rose-800`) مع زر "إعادة المحاولة".
5. **حالة النجاح (Success State):** اشعار Toast أو modal أخضر خفيف يوضح تم حفظ العملية بنجاح.

### ب. حالات الحضور والبصمة الخاصة (Attendance-Specific States)
1. **لم يسجل حضور:** زر البصمة أخضر بحجم كبير مع نص "تسجيل الحضور الآن".
2. **حاضر (عمل قائم):** زر البصمة يتغير للأزرق/البنفسجي مع ظهور أزرار الاستراحة ومؤشر وقت الحضور.
3. **متأخر (Late):** شارة أصلية صفراء أمبر (`bg-amber-100 text-amber-800 border border-amber-300`).
4. **في استراحة (In Break):** شارة برتقالية (`bg-orange-100 text-orange-800`) وتفعيل زر "إنهاء الاستراحة".
5. **خارج النطاق الجغرافي (Out of Geofence):** تعطيل زر البصمة أو إظهار تنبيه أحمر ومؤشر البعد بالأمتار عن الفرع.
6. **GPS غير متاح / ضعيف:** إظهار تنبيه تحذيري "يرجى تفعيل خدمة الموقع الجغرافي GPS لتمكين تسجيل البصمة".
7. **جهاز غير معتمد (Untrusted Device):** قفل إمكانية تبصيم الموظف وإظهار رسالة "هذا الجهاز غير معتمد من الإدارة، يرجى تقديم طلب اعتماد جهاز".
8. **طلب تصحيح قيد المراجعة:** إظهار شارة رمادية/أمبر على سجل اليوم توضح أن البصمة تحت مراجعة المسؤول.

---

## 5. نظام التصميم الحالي (Current Design System Tokens)

مشروع بصمة يعتمد رسمياً وحصرياً على **الوضع الفاتح الصريح عالي التباين (Pure High-Contrast Light Mode)** في كافة الشاشات والنوافذ المنبثقة:

- **الألوان الأساسية (Primary Colors):**
  - **Emerald Primary:** `#059669` (`bg-emerald-600`), `#047857` (`bg-emerald-700`)
  - **Sky Secondary:** `#0284c7` (`bg-sky-600`), `#0369a1` (`bg-sky-700`)
- **ألوان الحالات (Status Colors):**
  - **Success (نجاح / حضور):** خلفية `#ecfdf5` (`bg-emerald-50`), نص `#065f46` (`text-emerald-800`), حد `#a7f3d0` (`border-emerald-200`).
  - **Warning (تأخير / معلق):** خلفية `#fffbeb` (`bg-amber-50`), نص `#92400e` (`text-amber-800`), حد `#fde68a` (`border-amber-200`).
  - **Error (غياب / رفض / حظر):** خلفية `#fff1f2` (`bg-rose-50`), نص `#9f1239` (`text-rose-800`), حد `#fecdd3` (`border-rose-200`).
  - **Info (معلومات / استئذان):** خلفية `#f0f9ff` (`bg-sky-50`), نص `#075985` (`text-sky-800`), حد `#bae6fd` (`border-sky-200`).
- **خلفيات الشاشات والبطاقات (Background Colors):**
  - **خلفية التطبيق العامة (Body):** `#f8fafc` (`bg-slate-50`).
  - **خلفية البطاقات والنوافذ (Cards & Modals):** `#ffffff` (`bg-white`).
  - **خلفية التعتيم للنوافذ (Modal Backdrop):** `bg-slate-900/40 backdrop-blur-sm`.
- **خطوط النصوص (Typography):**
  - **عائلة الخط (Font Family):** `'IBM Plex Sans Arabic', 'Tajawal', sans-serif`.
  - **أحجام الخطوط (Font Sizes):** `text-[10px]`, `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px).
  - **أوزان الخطوط:** `font-normal` (400), `font-medium` (500), `font-semibold` (600), `font-bold` (700), `font-extrabold` (800).
- **حواف العناصر (Border Radius):**
  - البطاقات الرئيسية: `rounded-2xl` (16px) أو `rounded-3xl` (24px).
  - الأزرار والحقول: `rounded-xl` (12px) أو `rounded-2xl` (16px).
  - الشارات (Badges): `rounded-full` (9999px).
- **الظلال (Shadows):**
  - `shadow-sm` للبطاقات الخفيفة.
  - `shadow-md` و `shadow-xl` للنوافذ المنبثقة والزر الرئيسي.
  - `shadow-emerald-600/20` للظلال الملونة التفاعلية.

---

## 6. المكونات المشتركة المعاد استخدامها (Shared Component Catalog)

| اسم المكون (Component Name) | ملف المكون | أماكن الاستخدام في المشروع |
| :--- | :--- | :--- |
| **`Navbar`** | `src/components/Navbar.tsx` | أعلى كافة الشاشات الإدارية (`/admin`, `/admin/approvals`, `/admin/shifts`, إلخ) |
| **`BottomNav`** | `src/components/ui/BottomNav.tsx` | أسفل شاشات الموظف على الهاتف المحمول (`/`, `/profile`) |
| **`EmployeeHeroCard`** | `src/components/ui/EmployeeHeroCard.tsx` | أعلى الشاشة الرئيسية للموظف (`/`) |
| **`AttendanceActionCard`** | `src/components/employee/attendance-action-card.tsx` | الكرت المركزي لبصمة الحضور والدوام (`/`) |
| **`PushNotificationManager`** | `src/components/ui/PushNotificationManager.tsx` | الشاشة الرئيسية للموظف والملف الشخصي |
| **`StatusBadge`** | `src/components/ui/StatusBadge.tsx` | في جميع الجداول والكروت لعرض حالة (حاضر، غائب، معلق، معتمد) |
| **`Button`** | `src/components/ui/button.tsx` | الأزرار القياسية في النوافذ والجداول |
| **`BasmaCard`** | `src/components/ui/BasmaCard.tsx` | البطاقات الموحدة في المنظومة |
| **`ReportFilterBar`** | `src/components/ReportFilterBar.tsx` | شاشة التقارير اليومية وتقارير الرواتب |
| **`ReportTable`** | `src/components/reports/report-table.tsx` | استعراض جداول التقارير المباشرة |
| **`LeaveRequestModal`** | `src/components/LeaveRequestModal.tsx` | الشاشة الرئيسية للموظف ومراكز الطلبات |
| **`HourlyPermissionModal`** | `src/components/HourlyPermissionModal.tsx` | الشاشة الرئيسية للموظف |
| **`CorrectionRequestModal`** | `src/components/CorrectionRequestModal.tsx` | الشاشة الرئيسية للموظف وسجل البصمات |
| **`AddEmployeeModal`** | `src/components/AddEmployeeModal.tsx` | تبويب إدارة الموظفين |
| **`EditEmployeeModal`** | `src/components/EditEmployeeModal.tsx` | تبويب إدارة الموظفين |
| **`BranchLocationPickerModal`** | `src/components/BranchLocationPickerModal.tsx` | تبويب إدارة الفروع بالخريطة |

---

## 7. التجاوب وتجربة الشاشات (Responsive Design Behavior)

- **سطح المكتب (Desktop View - Min Width 1024px):**
  - ظهور شريط التنقل العلوي `Navbar` بكامل الخيارات والتبويبات.
  - اختفاء شريط التنقل السفلي `BottomNav`.
  - عرض الجداول بكافة أعمدتها مع التوسيع والتصفية المباشرة.
  - عرض البطاقات الإحصائية (KPIs) في شبكة من 4 إلى 5 أعمدة.
  - النوافذ المنبثقة تظهر ممركزة في وسط الشاشة بعرض محدد (`max-w-xl` أو `max-w-2xl`).

- **الهاتف المحمول (Mobile View / PWA - Max Width 768px):**
  - الاعتماد الكامل على شريط التنقل السفلي المثبت `BottomNav` المزود بلصقات الأمان (`pb-safe`).
  - تحول الجداول المعقدة إلى سحب أفقي متجاوب (`overflow-x-auto`) أو كروت رأسية متتالية.
  - النوافذ المنبثقة تنبثق من الأسفل كـ Bottom Sheets أو تأخذ كامل عرض الشاشة مع هوامش خفيفة.
  - تحسين مناطق اللمس (Touch Targets) لتكون بحجم لا يقل عن 44×44 بكسل لجميع الأزرار.

---

## 8. خريطة بنية التنقل الفعلية (Actual Navigation Architecture Map)

```text
[شاشة تسجيل الدخول /login]
         │
         ├─── (دخول موظف عادي) ───► [واجهة الموظف PWA]
         │                              ├── الرئيسية والدوام (/)
         │                              ├── الطلبات والاعتمادات (/admin/approvals - للمشرفين)
         │                              ├── التنبيهات والإشعارات (Notification Sheet)
         │                              └── الملف الشخصي (/profile)
         │
         └─── (دخول مسؤول/إداري) ───► [لوحة التحكم الإدارية /admin]
                                        ├── 1. النشاط المباشر (Live Activity Tab)
                                        ├── 2. الموظفين (Employees Tab)
                                        ├── 3. الفروع والجغرافيا (Branches Tab)
                                        ├── 4. سجل التدقيق (Audit Log Tab)
                                        ├── 5. الإعدادات المركزية (System Settings Tab)
                                        │
                                        ├── [مركز الاعتمادات /admin/approvals]
                                        ├── [إدارة الورديات /admin/shifts]
                                        ├── [إدارة الأجهزة /admin/devices]
                                        ├── [إدارة المهام /admin/tasks]
                                        ├── [التقرير اللحظي /admin/reports/today]
                                        ├── [صحة النظام /admin/system-health]
                                        └── [مفتش السجلات /admin/audit-log]
```

---

## 9. نقاط التكرار وأنماط التصميم الرصدية (Design Duplications & Patterns Scan)

- **شريط التنقل (Navbar & Header Patterns):** يوجد شريط تنقل علوي رئيسي ثابت `Navbar` وشريط تنقل سفلي `BottomNav` للموبايل.
- **أنماط الأزرار (Button Styles):** تتركز على كلاسات Tailwind القياسية والمكون الموحد `Button` مع أزرار متدرجة تدرجاً ناعماً للأحداث الرئيسية (تسجيل الحضور/الانصراف).
- **أنماط الشارات (Status Badges):** يتم استخدام مكونين مكملين (`StatusBadge` و `status-badge.tsx`) لتغطية شارات الجداول وشارات الكروت.
- **تنسيق التاريخ والوقت:** استخدام توقيت ليبيا الرسمي (`Africa/Tripoli`) مع التوقيت العربي 12 ساعة (`ص` / `م`).

---

## 10. ربط الشاشات بالملفات والأكواد (FILES_AND_COMPONENTS_REFERENCE)

| اسم الشاشة | Route | ملف الصفحة الرئيسي (Page File) | المكونات الرئيسية | المكونات المشتركة | النمط الأساسي (Styles) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **البصمة الرئيسية** | `/` | `src/app/page.tsx` | `EmployeeHeroCard`, `AttendanceActionCard` | `Navbar`, `BottomNav`, `PushNotificationManager` | Tailwind + `globals.css` |
| **تسجيل الدخول** | `/login` | `src/app/login/page.tsx` | Login Form, OTP Box | `Button`, `BasmaCard` | Tailwind Flex Center |
| **الملف الشخصي** | `/profile` | `src/app/profile/page.tsx` | Profile Details, Password Form | `Navbar`, `BottomNav`, `StatusBadge` | Tailwind Grid |
| **لوحة التحكم** | `/admin` | `src/app/admin/page.tsx` | `LiveActivity`, `EmployeesTab`, `SystemSettingsTab` | `Navbar`, `AddEmployeeModal`, `PayrollReportsTab` | Tailwind Tabs Layout |
| **الاعتمادات** | `/admin/approvals` | `src/app/admin/approvals/page.tsx` | Approvals Feed, Rejection Modal | `Navbar`, `StatusBadge`, `Button` | Tailwind Grid Feed |
| **الورديات** | `/admin/shifts` | `src/app/admin/shifts/page.tsx` | Shifts Cards, Shift Modal | `Navbar`, `Button`, `BasmaCard` | Tailwind Responsive Grid |
| **الأجهزة** | `/admin/devices` | `src/app/admin/devices/page.tsx` | Devices Table, Trust Action Menu | `Navbar`, `StatusBadge`, `Button` | Tailwind Table |
| **المهام الميدانية** | `/admin/tasks` | `src/app/admin/tasks/page.tsx` | Tasks Feed, Task Modal | `Navbar`, `StatusBadge`, `Button` | Tailwind Flex Stack |
| **التقرير اليومي** | `/admin/reports/today` | `src/app/admin/reports/today/page.tsx` | `ReportFilterBar`, `ReportTable` | `Navbar`, `Button` | Tailwind Overflow Table |
| **صحة النظام** | `/admin/system-health` | `src/app/admin/system-health/page.tsx` | Diagnostic Grid, Log Viewer | `Navbar`, `BasmaCard` | Tailwind Diagnostics |
| **سجل التدقيق** | `/admin/audit-log` | `src/app/admin/audit-log/page.tsx` | Audit Table, JSON Diff Inspector | `Navbar`, `Button` | Tailwind Monospace Inspector |

---

> **خاتمة التقرير:** التقرير يعكس **الوضع الفعلي المكتمل** لتطبيق بصمة (Basma Enterprise v2.0.0) وهو جاهز بالكامل لإرساله لمراجعة وتدقيق الـ UI/UX.
