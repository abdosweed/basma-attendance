import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { requestOtpChallenge } from '@/lib/otp';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'غير مصرح للوصول.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { purpose = 'CHECK_IN' } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { employee: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود.' }, { status: 404 });
    }

    const result = await requestOtpChallenge(
      user.id,
      purpose,
      user.employee?.companyId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, cooldownSeconds: result.cooldownSeconds },
        { status: result.cooldownSeconds ? 429 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      challengeId: result.challengeId,
      expiresInSeconds: result.expiresInSeconds,
      providerStatus: result.providerStatus,
    });
  } catch (error: any) {
    console.error('OTP request API error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء طلب رمز التحقق OTP.' }, { status: 500 });
  }
}
