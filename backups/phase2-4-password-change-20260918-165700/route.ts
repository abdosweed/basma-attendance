import { NextResponse } from 'next/server';
import { getAuthenticatedUser, verifyPassword, hashPassword, validatePasswordPolicy } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح للوصول. يرجى تسجيل الدخول.' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'يرجى إدخال كلمة المرور الحالية وكلمة المرور الجديدة' },
        { status: 400 }
      );
    }

    // 1. فحص سياسة كلمة المرور الجديدة
    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.isValid) {
      return NextResponse.json({ error: policyCheck.error }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // 2. التحقق من كلمة المرور الحالية
    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
    }

    // 3. التشفير والتحديث مع تصفير mustChangePassword
    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح وتحديث أمان الحساب 🟢',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء تغيير كلمة المرور' }, { status: 500 });
  }
}

