import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PAT (Production Acceptance Test) Data Seeding...');

  // 1. Create Company
  const company = await prisma.company.upsert({
    where: { id: 'pat-company-1' },
    update: {},
    create: {
      id: 'pat-company-1',
      name: 'شركة بصمة للحلول الرقمية',
    },
  });
  console.log('✅ Company created:', company.name);

  // 2. Create Branches
  const mainBranch = await prisma.branch.upsert({
    where: { id: 'pat-branch-main' },
    update: {
      latitude: 24.7136,
      longitude: 46.6753,
      geofenceRadius: 100,
    },
    create: {
      id: 'pat-branch-main',
      companyId: company.id,
      name: 'الفرع الرئيسي - الرياض',
      address: 'طريق الملك فهد، الرياض',
      latitude: 24.7136,
      longitude: 46.6753,
      geofenceRadius: 100,
    },
  });

  const jeddahBranch = await prisma.branch.upsert({
    where: { id: 'pat-branch-jeddah' },
    update: {
      latitude: 21.5433,
      longitude: 39.1728,
      geofenceRadius: 50,
    },
    create: {
      id: 'pat-branch-jeddah',
      companyId: company.id,
      name: 'فرع جدة - الكورنيش',
      address: 'طريق الكورنيش، جدة',
      latitude: 21.5433,
      longitude: 39.1728,
      geofenceRadius: 50,
    },
  });
  console.log('✅ Branches created:', mainBranch.name, '|', jeddahBranch.name);

  // 3. Create Departments
  const itDept = await prisma.department.upsert({
    where: { id: 'pat-dept-it' },
    update: {},
    create: {
      id: 'pat-dept-it',
      companyId: company.id,
      branchId: mainBranch.id,
      name: 'قسم الإدارة والتقنية (IT)',
      code: 'IT',
    },
  });

  const opsDept = await prisma.department.upsert({
    where: { id: 'pat-dept-ops' },
    update: {},
    create: {
      id: 'pat-dept-ops',
      companyId: company.id,
      branchId: mainBranch.id,
      name: 'قسم العمليات والخدمات (Operations)',
      code: 'OPS',
    },
  });
  console.log('✅ Departments created:', itDept.name, '|', opsDept.name);

  // 4. Create Shifts
  const morningShift = await prisma.shift.upsert({
    where: { id: 'pat-shift-morning' },
    update: { maxBreaksPerShift: 1 },
    create: {
      id: 'pat-shift-morning',
      companyId: company.id,
      name: 'الوردية الصباحية (09:00 - 16:00)',
      startTime: '09:00',
      endTime: '16:00',
      gracePeriodMins: 15,
      workingDays: 'SUN,MON,TUE,WED,THU',
      isNightShift: false,
      maxBreaksPerShift: 1,
    },
  });

  const eveningShift = await prisma.shift.upsert({
    where: { id: 'pat-shift-evening' },
    update: { maxBreaksPerShift: 1 },
    create: {
      id: 'pat-shift-evening',
      companyId: company.id,
      name: 'الوردية المسائية (16:00 - 23:00)',
      startTime: '16:00',
      endTime: '23:00',
      gracePeriodMins: 15,
      workingDays: 'SUN,MON,TUE,WED,THU',
      isNightShift: false,
      maxBreaksPerShift: 1,
    },
  });

  const nightShift = await prisma.shift.upsert({
    where: { id: 'pat-shift-night' },
    update: { maxBreaksPerShift: 2 },
    create: {
      id: 'pat-shift-night',
      companyId: company.id,
      name: 'الوردية الليلية (23:00 - 07:00)',
      startTime: '23:00',
      endTime: '07:00',
      gracePeriodMins: 15,
      workingDays: 'SUN,MON,TUE,WED,THU,FRI,SAT',
      isNightShift: true,
      maxBreaksPerShift: 2,
    },
  });
  console.log('✅ Shifts created:', morningShift.name, '|', eveningShift.name, '|', nightShift.name);

  // 5. Create System Settings
  await prisma.systemSetting.upsert({
    where: { id: 'global-settings' },
    update: {
      geofenceValidationMode: 'STRICT',
      maxBreaksPerShift: 1,
      maxAcceptedGpsAccuracy: 25.0,
      enableWorkGeofenceMonitoring: true,
    },
    create: {
      id: 'global-settings',
      companyId: company.id,
      geofenceValidationMode: 'STRICT',
      maxBreaksPerShift: 1,
      maxAcceptedGpsAccuracy: 25.0,
      enableWorkGeofenceMonitoring: true,
    },
  });

  // Helper for password hashing
  const defaultPasswordHash = await bcrypt.hash('BasmaPass123!', 10);

  // 6. Create Users & Employee Profiles
  const userRoles = [
    {
      id: 'usr-superadmin',
      email: 'superadmin@basma.app',
      role: 'SUPER_ADMIN',
      empNum: 'PAT-EMP-000',
      firstName: 'خالد',
      lastName: 'السوبر',
      jobTitle: 'مدير النظام الأعلى',
      deptId: itDept.id,
      branchId: mainBranch.id,
      shiftId: morningShift.id,
      isActive: true,
    },
    {
      id: 'usr-admin',
      email: 'admin@basma.app',
      role: 'ADMIN',
      empNum: 'PAT-EMP-001',
      firstName: 'عبدالله',
      lastName: 'الأدمن',
      jobTitle: 'مدير النظام',
      deptId: itDept.id,
      branchId: mainBranch.id,
      shiftId: morningShift.id,
      isActive: true,
    },
    {
      id: 'usr-hr',
      email: 'hr@basma.app',
      role: 'HR',
      empNum: 'PAT-EMP-002',
      firstName: 'سارة',
      lastName: 'الموارد البشرية',
      jobTitle: 'أخصائي موارد بشرية',
      deptId: itDept.id,
      branchId: mainBranch.id,
      shiftId: morningShift.id,
      isActive: true,
    },
    {
      id: 'usr-manager',
      email: 'manager@basma.app',
      role: 'BRANCH_MANAGER',
      empNum: 'PAT-EMP-003',
      firstName: 'فهد',
      lastName: 'مدير الفرع',
      jobTitle: 'مدير الفرع الرئيسي',
      deptId: opsDept.id,
      branchId: mainBranch.id,
      shiftId: morningShift.id,
      isActive: true,
    },
    {
      id: 'usr-emp1',
      email: 'emp1@basma.app',
      role: 'EMPLOYEE',
      empNum: 'EMP-101',
      firstName: 'محمد',
      lastName: 'الصباحي',
      jobTitle: 'مهندس برمجيات',
      deptId: itDept.id,
      branchId: mainBranch.id,
      shiftId: morningShift.id,
      isActive: true,
    },
    {
      id: 'usr-emp2',
      email: 'emp2@basma.app',
      role: 'EMPLOYEE',
      empNum: 'EMP-102',
      firstName: 'أحمد',
      lastName: 'المسائي',
      jobTitle: 'محلل نظم',
      deptId: itDept.id,
      branchId: mainBranch.id,
      shiftId: eveningShift.id,
      isActive: true,
    },
    {
      id: 'usr-emp3',
      email: 'emp3@basma.app',
      role: 'EMPLOYEE',
      empNum: 'EMP-103',
      firstName: 'عمر',
      lastName: 'الليلي',
      jobTitle: 'مشرف وردية ليلية',
      deptId: opsDept.id,
      branchId: mainBranch.id,
      shiftId: nightShift.id,
      isActive: true,
    },
    {
      id: 'usr-emp4',
      email: 'emp4@basma.app',
      role: 'EMPLOYEE',
      empNum: 'EMP-104',
      firstName: 'سامي',
      lastName: 'فرع جدة',
      jobTitle: 'فني عمليات',
      deptId: opsDept.id,
      branchId: jeddahBranch.id,
      shiftId: morningShift.id,
      isActive: true,
    },
    {
      id: 'usr-emp5',
      email: 'emp5@basma.app',
      role: 'EMPLOYEE',
      empNum: 'EMP-105',
      firstName: 'يوسف',
      lastName: 'المرن',
      jobTitle: 'مستشار دعم ميداني',
      deptId: opsDept.id,
      branchId: mainBranch.id,
      shiftId: morningShift.id,
      isActive: true,
    },
    {
      id: 'usr-disabled',
      email: 'disabled@basma.app',
      role: 'EMPLOYEE',
      empNum: 'EMP-999',
      firstName: 'منذر',
      lastName: 'المعطل',
      jobTitle: 'موظف غير نشط',
      deptId: opsDept.id,
      branchId: mainBranch.id,
      shiftId: morningShift.id,
      isActive: false,
    },
  ];

  for (const u of userRoles) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        isActive: u.isActive,
        passwordHash: defaultPasswordHash,
      },
      create: {
        id: u.id,
        email: u.email,
        passwordHash: defaultPasswordHash,
        role: u.role,
        isActive: u.isActive,
      },
    });

    // Find existing employee by userId or employeeNumber
    const existingEmp = await prisma.employee.findFirst({
      where: {
        OR: [{ userId: user.id }, { employeeNumber: u.empNum }],
      },
    });

    let emp;
    if (existingEmp) {
      emp = await prisma.employee.update({
        where: { id: existingEmp.id },
        data: {
          employeeNumber: u.empNum,
          firstName: u.firstName,
          lastName: u.lastName,
          jobTitle: u.jobTitle,
          primaryBranchId: u.branchId,
          departmentId: u.deptId,
          status: u.isActive ? 'ACTIVE' : 'INACTIVE',
        },
      });
    } else {
      emp = await prisma.employee.create({
        data: {
          id: `emp-id-${u.empNum.toLowerCase()}`,
          userId: user.id,
          companyId: company.id,
          employeeNumber: u.empNum,
          firstName: u.firstName,
          lastName: u.lastName,
          jobTitle: u.jobTitle,
          primaryBranchId: u.branchId,
          departmentId: u.deptId,
          status: u.isActive ? 'ACTIVE' : 'INACTIVE',
        },
      });
    }

    // Link Branch
    await prisma.employeeBranch.upsert({
      where: {
        employeeId_branchId: {
          employeeId: emp.id,
          branchId: u.branchId,
        },
      },
      update: {},
      create: {
        employeeId: emp.id,
        branchId: u.branchId,
      },
    });

    // Link Shift
    await prisma.employeeShift.upsert({
      where: { id: `emp-shift-${emp.id}` },
      update: { shiftId: u.shiftId },
      create: {
        id: `emp-shift-${emp.id}`,
        employeeId: emp.id,
        shiftId: u.shiftId,
      },
    });

    console.log(`👤 User/Employee seeded: ${u.email} (${u.role}) -> ${emp.firstName} ${emp.lastName}`);
  }

  console.log('\n🎉 PAT Data Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
