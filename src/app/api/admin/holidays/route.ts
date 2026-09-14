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

    const company = await prisma.company.findFirst();
    if (!company) return NextResponse.json({ holidays: [] });

    const holidays = await prisma.holiday.findMany({
      where: { companyId: company.id },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({ holidays });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في جلب العطلات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const body = await request.json();
    const { name, startDate, endDate } = body;

    if (!name || !startDate) {
      return NextResponse.json({ error: 'اسم وتاريخ العطلة إجباري' }, { status: 400 });
    }

    const company = await prisma.company.findFirst();
    if (!company) return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });

    const holiday = await prisma.holiday.create({
      data: {
        companyId: company.id,
        name: name.trim(),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : new Date(startDate),
      },
    });

    return NextResponse.json({ success: true, message: 'تمت إضافة العطلة الرسمية بنجاح 🌴', holiday });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في إضافة العطلة' }, { status: 500 });
  }
}
