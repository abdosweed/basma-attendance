import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { login, password } = body;

    if (!login || !password) {
      return NextResponse.json(
        { error: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف وكلمة المرور' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: login.trim().toLowerCase() }, { phone: login.trim() }],
      },
      include: {
        employee: {
          include: {
            primaryBranch: true,
            company: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'بيانات الدخول غير صحيحة أو الحساب غير مفعّل' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const employee = user.employee;
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: employee?.id,
      companyId: employee?.companyId,
      name: employee ? `${employee.firstName} ${employee.lastName}` : user.email,
    };

    await setSessionCookie(sessionData);

    // تحديث وقت آخر دخول
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: sessionData.name,
        employeeId: employee?.id,
        companyName: employee?.company?.name,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول' }, { status: 500 });
  }
}
