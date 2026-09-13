const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Starting Database Seeding for Basma Attendance System...');

  // 1. تنظيف البيانات القديمة
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.suspiciousAttempt.deleteMany({});
  await prisma.holiday.deleteMany({});
  await prisma.attendanceCorrectionRequest.deleteMany({});
  await prisma.permissionRequest.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.leaveType.deleteMany({});
  await prisma.breakRecord.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.attendanceEvent.deleteMany({});
  await prisma.employeeShift.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.trustedDevice.deleteMany({});
  await prisma.employeeBranch.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.systemSetting.deleteMany({});
  await prisma.company.deleteMany({});

  // 2. إنشاء الشركة
  const company = await prisma.company.create({
    data: {
      name: 'شركة بصمة لتكنولوجيا المعلومات',
      timezone: 'Africa/Tripoli',
      country: 'LY',
      currency: 'LYD',
    },
  });
  console.log('✅ Created Company:', company.name);

  // 3. إعدادات النظام
  await prisma.systemSetting.create({
    data: {
      companyId: company.id,
      maxAcceptedGpsAccuracy: 50.0,
      suspiciousLocationPolicy: 'BLOCK',
      trustedDevicesPolicy: 'MULTI',
      overtimePolicy: 'AUTO_APPROVE',
    },
  });

  // 4. إنشاء الفروع
  const branchMain = await prisma.branch.create({
    data: {
      companyId: company.id,
      name: 'الفرع الرئيسي - طرابلس / الرياض',
      address: 'وسط المدينة - الشارع الرئيسي',
      latitude: 32.8872,
      longitude: 13.1913,
      geofenceRadius: 100.0, // 100 متر
    },
  });

  const branchBranch2 = await prisma.branch.create({
    data: {
      companyId: company.id,
      name: 'فرع المعادي / الشارقة',
      address: 'منطقة الأعمال الحديثة',
      latitude: 32.875,
      longitude: 13.18,
      geofenceRadius: 50.0, // 50 متر
    },
  });
  console.log('✅ Created Branches:', branchMain.name, ',', branchBranch2.name);

  // 5. إنشاء الأقسام
  const deptIT = await prisma.department.create({
    data: { companyId: company.id, branchId: branchMain.id, name: 'تقنية المعلومات', code: 'IT' },
  });
  const deptHR = await prisma.department.create({
    data: { companyId: company.id, branchId: branchMain.id, name: 'الموارد البشرية', code: 'HR' },
  });
  const deptSales = await prisma.department.create({
    data: { companyId: company.id, branchId: branchBranch2.id, name: 'المبيعات والتسويق', code: 'SALES' },
  });

  // 6. إنشاء الورديات
  const shiftMorning = await prisma.shift.create({
    data: {
      companyId: company.id,
      name: 'الوردية الصباحية (09:00 - 16:00)',
      startTime: '09:00',
      endTime: '16:00',
      gracePeriodMins: 10,
      isNightShift: false,
      allowedBreakMins: 60,
    },
  });

  const shiftEvening = await prisma.shift.create({
    data: {
      companyId: company.id,
      name: 'الوردية المسائية (16:00 - 23:00)',
      startTime: '16:00',
      endTime: '23:00',
      gracePeriodMins: 15,
      isNightShift: false,
      allowedBreakMins: 45,
    },
  });

  const shiftNight = await prisma.shift.create({
    data: {
      companyId: company.id,
      name: 'الوردية الليلية (23:00 - 07:00)',
      startTime: '23:00',
      endTime: '07:00',
      gracePeriodMins: 15,
      isNightShift: true,
      allowedBreakMins: 60,
    },
  });
  console.log('✅ Created Shifts');

  // 7. أنواع الإجازات
  const leaveAnnual = await prisma.leaveType.create({
    data: { companyId: company.id, name: 'إجازة سنوية', code: 'ANNUAL', maxDaysPerYear: 21, isPaid: true },
  });
  const leaveSick = await prisma.leaveType.create({
    data: { companyId: company.id, name: 'إجازة مرضية', code: 'SICK', maxDaysPerYear: 14, requiresAttachment: true, isPaid: true },
  });
  const leaveEmergency = await prisma.leaveType.create({
    data: { companyId: company.id, name: 'إجازة اضطرارية', code: 'EMERGENCY', maxDaysPerYear: 5, isPaid: true },
  });

  // 8. إنشاء المستخدمين والموظفين التجريبيين
  const defaultPasswordHash = await bcrypt.hash('admin123', 10);
  const empPasswordHash = await bcrypt.hash('emp123', 10);

  const usersData = [
    {
      email: 'admin@basma.com',
      phone: '+218910000001',
      role: 'SUPER_ADMIN',
      firstName: 'عبدالله',
      lastName: 'المدير',
      jobTitle: 'المدير العام والتنفيذي',
      empNum: 'EMP-001',
      deptId: deptIT.id,
      branchId: branchMain.id,
      password: defaultPasswordHash,
    },
    {
      email: 'hr@basma.com',
      phone: '+218910000002',
      role: 'HR',
      firstName: 'سارة',
      lastName: 'الموارد البشرية',
      jobTitle: 'مدير الموارد البشرية',
      empNum: 'EMP-002',
      deptId: deptHR.id,
      branchId: branchMain.id,
      password: await bcrypt.hash('hr123', 10),
    },
    {
      email: 'manager@basma.com',
      phone: '+218910000003',
      role: 'BRANCH_MANAGER',
      firstName: 'طارق',
      lastName: 'مدير الفرع',
      jobTitle: 'مدير الفرع الرئيسي',
      empNum: 'EMP-003',
      deptId: deptSales.id,
      branchId: branchMain.id,
      password: await bcrypt.hash('manager123', 10),
    },
    {
      email: 'employee@basma.com',
      phone: '+218910000004',
      role: 'EMPLOYEE',
      firstName: 'أحمد',
      lastName: 'الموظف التجريبي',
      jobTitle: 'مهندس برمجيات',
      empNum: 'EMP-004',
      deptId: deptIT.id,
      branchId: branchMain.id,
      password: empPasswordHash,
    },
    {
      email: 'mohamed@basma.com',
      phone: '+218910000005',
      role: 'EMPLOYEE',
      firstName: 'محمد',
      lastName: 'حسن',
      jobTitle: 'محلل نظم',
      empNum: 'EMP-005',
      deptId: deptIT.id,
      branchId: branchMain.id,
      password: empPasswordHash,
    },
    {
      email: 'mahmoud@basma.com',
      phone: '+218910000006',
      role: 'EMPLOYEE',
      firstName: 'محمود',
      lastName: 'علي',
      jobTitle: 'ممثل مبيعات',
      empNum: 'EMP-006',
      deptId: deptSales.id,
      branchId: branchBranch2.id,
      password: empPasswordHash,
    },
    {
      email: 'fatima@basma.com',
      phone: '+218910000007',
      role: 'EMPLOYEE',
      firstName: 'فاطمة',
      lastName: 'الزهراء',
      jobTitle: 'مصممة واجهات',
      empNum: 'EMP-007',
      deptId: deptIT.id,
      branchId: branchMain.id,
      password: empPasswordHash,
    },
    {
      email: 'khalid@basma.com',
      phone: '+218910000008',
      role: 'EMPLOYEE',
      firstName: 'خالد',
      lastName: 'العثمان',
      jobTitle: 'دعم فني ميداني',
      empNum: 'EMP-008',
      deptId: deptIT.id,
      branchId: branchMain.id,
      password: empPasswordHash,
      allowOutsideBranch: true, // مسموح بالعمل خارج الفرع
    },
  ];

  const createdEmployees = [];

  for (const u of usersData) {
    const userObj = await prisma.user.create({
      data: {
        email: u.email,
        phone: u.phone,
        passwordHash: u.password,
        role: u.role,
      },
    });

    const empObj = await prisma.employee.create({
      data: {
        userId: userObj.id,
        companyId: company.id,
        primaryBranchId: u.branchId,
        departmentId: u.deptId,
        employeeNumber: u.empNum,
        firstName: u.firstName,
        lastName: u.lastName,
        jobTitle: u.jobTitle,
        phone: u.phone,
        allowOutsideBranch: u.allowOutsideBranch || false,
        hireDate: new Date('2024-01-01'),
      },
    });

    // ربط بالفروع المصرحة
    await prisma.employeeBranch.create({
      data: {
        employeeId: empObj.id,
        branchId: u.branchId,
      },
    });

    // ربط بالوردية الصباحية
    await prisma.employeeShift.create({
      data: {
        employeeId: empObj.id,
        shiftId: shiftMorning.id,
      },
    });

    createdEmployees.push(empObj);
  }

  console.log(`✅ Created ${createdEmployees.length} Employees with Users and Shifts`);

  // 9. توليد سجلات حضور تجريبية لليوم
  const todayStr = new Date().toISOString().split('T')[0];
  const mainEmp = createdEmployees.find((e) => e.employeeNumber === 'EMP-004'); // أحمد המوظف

  if (mainEmp) {
    // حدث حضور في الوقت
    const checkInTime = new Date();
    checkInTime.setHours(8, 55, 0, 0);

    await prisma.attendanceEvent.create({
      data: {
        employeeId: mainEmp.id,
        branchId: branchMain.id,
        shiftId: shiftMorning.id,
        type: 'CHECK_IN',
        serverTimestamp: checkInTime,
        latitude: 32.88721,
        longitude: 13.19132,
        accuracy: 12.0,
        distanceFromBranch: 8.5,
        status: 'SUCCESS',
        source: 'PWA_MOBILE',
      },
    });

    await prisma.attendanceRecord.create({
      data: {
        employeeId: mainEmp.id,
        shiftId: shiftMorning.id,
        branchId: branchMain.id,
        date: todayStr,
        checkInAt: checkInTime,
        totalWorkedMinutes: 240,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: 0,
        status: 'PRESENT',
      },
    });

    // إنشاء استراحة جارية للموظف أحمد
    await prisma.breakRecord.create({
      data: {
        employeeId: mainEmp.id,
        startTime: new Date(Date.now() - 25 * 60 * 1000), // منذ 25 دقيقة
        status: 'ACTIVE',
      },
    });
  }

  // 10. سجل محاولة مشبوهة تجريبية
  const mohamedEmp = createdEmployees.find((e) => e.employeeNumber === 'EMP-005');
  if (mohamedEmp) {
    await prisma.suspiciousAttempt.create({
      data: {
        employeeId: mohamedEmp.id,
        latitude: 32.95,
        longitude: 13.3,
        accuracy: 120.0,
        reason: 'GPS_OUT_OF_BOUNDS',
        riskLevel: 'HIGH',
        actionTaken: 'BLOCKED',
        ipAddress: '197.24.18.99',
      },
    });
  }

  // 11. طلب إجازة معلق للتجربة
  const mahmoudEmp = createdEmployees.find((e) => e.employeeNumber === 'EMP-006');
  if (mahmoudEmp) {
    await prisma.leaveRequest.create({
      data: {
        employeeId: mahmoudEmp.id,
        leaveTypeId: leaveAnnual.id,
        startDate: new Date('2026-09-20'),
        endDate: new Date('2026-09-25'),
        totalDays: 5,
        reason: 'إجازة عائلية سنوية',
        status: 'PENDING',
      },
    });
  }

  // 12. إشعارات تجريبية
  if (mainEmp) {
    await prisma.notification.createMany({
      data: [
        {
          employeeId: mainEmp.id,
          title: 'تم تسجيل حضورك بنجاح',
          message: 'تم تسجيل الحضور في الساعة 08:55 في الفرع الرئيسي.',
          type: 'SUCCESS',
        },
        {
          employeeId: mainEmp.id,
          title: 'تذكير بالاستراحة',
          message: 'لا تنس إنهاء الاستراحة عند العودة لمهام عملك.',
          type: 'INFO',
        },
      ],
    });
  }

  console.log('🎉 Seeding completed successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
