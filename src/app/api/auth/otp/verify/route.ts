import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { verifyOtpChallenge } from '@/lib/otp';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'غير مصرح للوصول.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { purpose = 'CHECK_IN', otpCode } = body;

    if (!otpCode || typeof otpCode !== 'string' || otpCode.trim().length !== 6) {
      return NextResponse.json({ error: 'يرجى إدخال كود تحقق مكون من 6 أرقام.' }, { status: 400 });
    }

    const result = await verifyOtpChallenge(session.userId, purpose, otpCode);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, remainingAttempts: result.remainingAttempts },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error('OTP verify API error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء التحقق من رمز OTP.' }, { status: 500 });
  }
}
