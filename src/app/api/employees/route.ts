import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER', 'SUPERVISOR'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح للوصول إلى قائمة الموظفين' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const branchId = searchParams.get('branchId') || '';
    const departmentId = searchParams.get('departmentId') || '';

    // إذا كان مدير فرع، قصر الرؤية على موظفي فرعه فقط
    let branchFilter = branchId;
    if (session.role === 'BRANCH_MANAGER' && session.employeeId) {
      const managerEmp = await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: { primaryBranchId: true },
      });
      if (managerEmp?.primaryBranchId) {
        branchFilter = managerEmp.primaryBranchId;
      }
    }

    const employees = await prisma.employee.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(branchFilter ? { primaryBranchId: branchFilter } : {}),
        ...(departmentId ? { departmentId } : {}),
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { employeeNumber: { contains: query } },
          { phone: { contains: query } },
          { user: { email: { contains: query } } },
        ],
      },
      include: {
        user: { select: { id: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true } },
        primaryBranch: true,
        department: true,
        employeeBranches: { include: { branch: true } },
        employeeShifts: { include: { shift: true } },
        trustedDevices: true,
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ employees });
  } catch (error: any) {
    console.error('Fetch employees error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب الموظفين' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(session.role)) {
      return NextResponse.json(
        { error: 'غير مصرح لك بإضافة موظفين جديد. مخصص للمدراء ومسؤولي الموارد البشرية.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      employeeNumber,
      email,
      phone,
      password,
      role,
      jobTitle,
      departmentId,
      primaryBranchId,
      branchIds, // قائمة بالفروع المصرحة
      shiftId,
      allowOutsideBranch,
      hireDate,
      status,
    } = body;

    // 1. التحقق من البيانات الأساسية
    if (!firstName || !lastName || !employeeNumber || !email || !password || !role) {
      return NextResponse.json(
        { error: 'يرجى ملء جميع البيانات الأساسية (الاسم، الرقم الوظيفي، البريد الإلكتروني، كلمة المرور، والدور).' },
        { status: 400 }
      );
    }

    // منع مستخدم بصلاحية منخفضة من إنشاء مستخدم بصلاحية أعلى منه
    if (session.role !== 'SUPER_ADMIN' && role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'لا يمكنك إنشاء حساب بصلاحية المدير العام (SUPER_ADMIN).' },
        { status: 403 }
      );
    }

    // 2. التحقق من عدم التكرار (Unique Constraints Check)
    const [existingEmail, existingPhone, existingEmpNum] = await Promise.all([
      prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } }),
      phone ? prisma.user.findUnique({ where: { phone: phone.trim() } }) : null,
      prisma.employee.findUnique({ where: { employeeNumber: employeeNumber.trim() } }),
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مستخدم بالفعل لموظف آخر.' },
        { status: 400 }
      );
    }

    if (existingPhone) {
      return NextResponse.json(
        { error: 'رقم الهاتف مستخدم بالفعل لموظف آخر.' },
        { status: 400 }
      );
    }

    if (existingEmpNum) {
      return NextResponse.json(
        { error: 'الرقم الوظيفي مستخدم بالفعل لموظف آخر.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const empStatus = status || 'ACTIVE';

    // 3. إنشاء User + Employee + EmployeeBranch + EmployeeShift داخل Prisma Transaction واحدة
    const result = await prisma.$transaction(async (tx) => {
      // أ. إنشاء حساب المستخدم
      const newUser = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          passwordHash,
          role,
          isActive: empStatus === 'ACTIVE',
        },
      });

      // جلب معرف الشركة
      let companyId = session.companyId;
      if (!companyId) {
        const comp = await tx.company.findFirst();
        companyId = comp?.id;
      }

      // ب. إنشاء ملف الموظف
      const newEmployee = await tx.employee.create({
        data: {
          userId: newUser.id,
          companyId: companyId!,
          employeeNumber: employeeNumber.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone ? phone.trim() : null,
          jobTitle: jobTitle ? jobTitle.trim() : null,
          departmentId: departmentId || null,
          primaryBranchId: primaryBranchId || null,
          allowOutsideBranch: allowOutsideBranch || false,
          hireDate: hireDate ? new Date(hireDate) : new Date(),
          status: empStatus,
        },
      });

      // ج. ربط الموظف بالفروع المصرح بها
      const selectedBranches = Array.isArray(branchIds) && branchIds.length > 0
        ? branchIds
        : primaryBranchId
        ? [primaryBranchId]
        : [];

      for (const bId of selectedBranches) {
        await tx.employeeBranch.create({
          data: {
            employeeId: newEmployee.id,
            branchId: bId,
          },
        });
      }

      // د. ربط الموظف بالوردية إن وجدت
      if (shiftId) {
        await tx.employeeShift.create({
          data: {
            employeeId: newEmployee.id,
            shiftId,
          },
        });
      }

      // هـ. توثيق العملية في AuditLog
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'EMPLOYEE_CREATED',
          entity: 'Employee',
          entityId: newEmployee.id,
          newValue: JSON.stringify({
            employeeNumber: newEmployee.employeeNumber,
            name: `${newEmployee.firstName} ${newEmployee.lastName}`,
            email: newUser.email,
            role: newUser.role,
            status: newEmployee.status,
          }),
          reason: 'إضافة موظف جديد وإنشاء حسابه التلقائي في المنظومة',
        },
      });

      return { user: newUser, employee: newEmployee };
    });

    return NextResponse.json({
      success: true,
      message: 'تمت إضافة الموظف وإنشاء حسابه بنجاح',
      employee: result.employee,
    });
  } catch (error: any) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء إضافة الموظف' }, { status: 500 });
  }
}
