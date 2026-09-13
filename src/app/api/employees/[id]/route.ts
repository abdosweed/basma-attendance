import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // إذا كان موظف عادي، تيقن من أنه لا يشاهد سوى بياناته الخاصة فقط
    if (session.role === 'EMPLOYEE' && session.employeeId !== params.id) {
      return NextResponse.json({ error: 'غير مصرح لك باستعراض بيانات موظف آخر.' }, { status: 403 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true } },
        primaryBranch: true,
        department: true,
        employeeBranches: { include: { branch: true } },
        employeeShifts: { include: { shift: true } },
        attendanceRecords: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        breakRecords: {
          orderBy: { startTime: 'desc' },
          take: 20,
        },
        leaveRequests: {
          include: { leaveType: true },
          orderBy: { createdAt: 'desc' },
        },
        permissionRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ في جلب بيانات الموظف' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(session.role)) {
      return NextResponse.json(
        { error: 'غير مصرح لك بتعديل بيانات الموظفين' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      jobTitle,
      departmentId,
      primaryBranchId,
      branchIds,
      shiftId,
      allowOutsideBranch,
      role,
      status,
      newPassword,
    } = body;

    const existingEmp = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true, employeeBranches: true, employeeShifts: true },
    });

    if (!existingEmp) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    // لا يسمح بمستخدم صلاحيته منخفضة بمنح دور أعلى منه
    if (role && session.role !== 'SUPER_ADMIN' && role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'لا يمكنك تغيير الدور إلى المدير العام SUPER_ADMIN' }, { status: 403 });
    }

    const oldData = {
      name: `${existingEmp.firstName} ${existingEmp.lastName}`,
      role: existingEmp.user.role,
      status: existingEmp.status,
      primaryBranchId: existingEmp.primaryBranchId,
    };

    // التعديل الذري بـ Transaction
    await prisma.$transaction(async (tx) => {
      // 1. تحديث بيانات الموظف الأساسية والحالة (التعطيل soft update يغير status إلى INACTIVE دون حذف السجلات التاريخية)
      const empStatus = status !== undefined ? status : existingEmp.status;
      await tx.employee.update({
        where: { id: existingEmp.id },
        data: {
          firstName: firstName !== undefined ? firstName.trim() : existingEmp.firstName,
          lastName: lastName !== undefined ? lastName.trim() : existingEmp.lastName,
          jobTitle: jobTitle !== undefined ? jobTitle.trim() : existingEmp.jobTitle,
          departmentId: departmentId !== undefined ? departmentId : existingEmp.departmentId,
          primaryBranchId: primaryBranchId !== undefined ? primaryBranchId : existingEmp.primaryBranchId,
          allowOutsideBranch: allowOutsideBranch !== undefined ? allowOutsideBranch : existingEmp.allowOutsideBranch,
          status: empStatus,
        },
      });

      // 2. تحديث الحساب والدور وكلمة المرور إن وجدت
      const userUpdates: any = {};
      if (role && role !== existingEmp.user.role) {
        userUpdates.role = role;
      }
      if (empStatus) {
        userUpdates.isActive = empStatus === 'ACTIVE';
      }
      if (newPassword && newPassword.trim().length > 0) {
        userUpdates.passwordHash = await hashPassword(newPassword.trim());
      }

      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: existingEmp.userId },
          data: userUpdates,
        });
      }

      // 3. تحديث الفروع المصرحة إذا تم إرسالها
      if (Array.isArray(branchIds)) {
        await tx.employeeBranch.deleteMany({ where: { employeeId: existingEmp.id } });
        for (const bId of branchIds) {
          await tx.employeeBranch.create({
            data: { employeeId: existingEmp.id, branchId: bId },
          });
        }
      }

      // 4. تحديث الوردية إذا تم إرسالها
      if (shiftId !== undefined) {
        await tx.employeeShift.deleteMany({ where: { employeeId: existingEmp.id } });
        if (shiftId) {
          await tx.employeeShift.create({
            data: { employeeId: existingEmp.id, shiftId },
          });
        }
      }

      // 5. توثيق العملية في AuditLog
      const actionType = status === 'INACTIVE' || status === 'SUSPENDED' ? 'EMPLOYEE_DISABLED' : 'EMPLOYEE_UPDATED';
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: actionType,
          entity: 'Employee',
          entityId: existingEmp.id,
          oldValue: JSON.stringify(oldData),
          newValue: JSON.stringify({ role, status: empStatus, primaryBranchId }),
          reason: status === 'INACTIVE' ? 'تعطيل حساب الموظف والحفاظ على السجلات التاريخية' : 'تعديل بيانات الموظف والصلاحيات',
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'تم تحديث بيانات الموظف بنجاح',
    });
  } catch (error: any) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء تحديث بيانات الموظف' }, { status: 500 });
  }
}
