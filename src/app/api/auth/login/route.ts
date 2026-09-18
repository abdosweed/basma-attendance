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

    // 1. فحص الحظر التلقائي للحساب بسبب محاولات متتالية خاطئة
    const now = new Date();
    if (user.lockoutUntil && user.lockoutUntil > now) {
      const remainingMins = Math.ceil((user.lockoutUntil.getTime() - now.getTime()) / (1000 * 60));
      return NextResponse.json(
        {
          error: `🛑 تم حظر الحساب مؤقتاً بسبب تكرار محاولات الدخول الخاطئة. يرجى الانتظار لمدة ${remainingMins} دقيقة ثم إعادة المحاولة.`,
        },
        { status: 429 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      let newLockoutUntil = user.lockoutUntil;

      if (newFailedAttempts >= 5) {
        newLockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // حظر 15 دقيقة
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lockoutUntil: newLockoutUntil,
        },
      });

      if (newFailedAttempts >= 5) {
        return NextResponse.json(
          { error: '🛑 تم تجاوز الحد الأقصى للمحاولات (5 محاولات). تم حظر الحساب لمدة 15 دقيقة لحماية المنظومة.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: `كلمة المرور غير صحيحة. المحاولة (${newFailedAttempts} من 5)` },
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
      mustChangePassword: user.mustChangePassword,
    };

    await setSessionCookie(sessionData);

    // تحديث وقت آخر دخول وتصفير محاولات الفشل
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
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
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'حدث خطأ غير متوقع أثناء تسجيل الدخول' }, { status: 500 });
  }
}
