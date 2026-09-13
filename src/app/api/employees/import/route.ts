import { NextResponse } from 'next/server';
import { getAuthenticatedUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح لك باستيراد بيانات الموظفين' }, { status: 403 });
    }

    const body = await request.json();
    const { employees, defaultBranchId } = body;

    if (!Array.isArray(employees) || employees.length === 0) {
      return NextResponse.json({ error: 'يرجى إرسال قائمة موظفين صالحة للاستيراد.' }, { status: 400 });
    }

    const defaultPasswordHash = await hashPassword('emp123');
    let companyId = session.companyId;
    if (!companyId) {
      const comp = await prisma.company.findFirst();
      companyId = comp?.id;
    }

    const importedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const emp of employees) {
        const email = emp.email ? emp.email.trim().toLowerCase() : `emp_${emp.employeeNumber}@basma.com`;
        const empNum = emp.employeeNumber ? emp.employeeNumber.trim() : `EMP-${Math.floor(Math.random() * 9000 + 1000)}`;

        // فحص التكرار
        const existingUser = await tx.user.findUnique({ where: { email } });
        const existingEmp = await tx.employee.findUnique({ where: { employeeNumber: empNum } });

        if (existingUser || existingEmp) continue; // تخطي الموظف المكرر

        const user = await tx.user.create({
          data: {
            email,
            phone: emp.phone ? emp.phone.trim() : null,
            passwordHash: defaultPasswordHash,
            role: emp.role || 'EMPLOYEE',
            isActive: true,
          },
        });

        const newEmp = await tx.employee.create({
          data: {
            userId: user.id,
            companyId: companyId!,
            employeeNumber: empNum,
            firstName: emp.firstName ? emp.firstName.trim() : 'موظف',
            lastName: emp.lastName ? emp.lastName.trim() : 'جديد',
            jobTitle: emp.jobTitle ? emp.jobTitle.trim() : null,
            primaryBranchId: defaultBranchId || null,
            status: 'ACTIVE',
          },
        });

        if (defaultBranchId) {
          await tx.employeeBranch.create({
            data: { employeeId: newEmp.id, branchId: defaultBranchId },
          });
        }

        count++;
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: 'EMPLOYEE_BULK_IMPORT',
          entity: 'Employee',
          newValue: JSON.stringify({ importedCount: count }),
          reason: 'استيراد جماعي للموظفين من ملف Excel/CSV',
        },
      });

      return count;
    });

    return NextResponse.json({
      success: true,
      message: `تم استيراد ${importedCount} موظف بنجاح من إجمالي ${employees.length}.`,
      importedCount,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء استيراد ملف الموظفين' }, { status: 500 });
  }
}
