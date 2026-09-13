import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const shifts = await prisma.shift.findMany({
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ shifts });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في جلب الورديات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح لك بإنشاء ورديات' }, { status: 403 });
    }

    const body = await request.json();
    const { name, startTime, endTime, gracePeriodMins, isNightShift, allowedBreakMins } = body;

    if (!name || !startTime || !endTime) {
      return NextResponse.json({ error: 'يرجى إدخال اسم الوردية ووقت البداية ووقت النهاية.' }, { status: 400 });
    }

    let companyId = session.companyId;
    if (!companyId) {
      const comp = await prisma.company.findFirst();
      companyId = comp?.id;
    }

    const newShift = await prisma.shift.create({
      data: {
        companyId: companyId!,
        name: name.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        gracePeriodMins: Number(gracePeriodMins) || 10,
        isNightShift: Boolean(isNightShift),
        allowedBreakMins: Number(allowedBreakMins) || 60,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تمت إضافة الوردية بنجاح',
      shift: newShift,
    });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء إضافة الوردية' }, { status: 500 });
  }
}
