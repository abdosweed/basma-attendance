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

    const company = await prisma.company.findFirst({
      include: { systemSettings: true },
    });

    const settings = company?.systemSettings[0];
    const currentMode = (settings as any)?.environmentMode || 'DEMO';

    return NextResponse.json({
      environmentMode: currentMode,
      companyId: company?.id,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في جلب حالة البيئة' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح لك بتغيير بيئة المنظومة' }, { status: 403 });
    }

    const body = await request.json();
    const { mode, action } = body;

    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
    }

    // 1. إجراء تصفير بيانات الاختبار التجريبية (RESET_DEMO)
    if (action === 'RESET_DEMO') {
      await prisma.$transaction([
        prisma.attendanceEvent.deleteMany({}),
        prisma.attendanceRecord.deleteMany({}),
        prisma.geofenceViolation.deleteMany({}),
        prisma.auditLog.deleteMany({}),
      ]);

      return NextResponse.json({
        success: true,
        message: 'تم تصفير جميع بيانات الحضور والانصراف والاختبارات التجريبية بنجاح. النظام جاهز 100% للعمل الحقيقي.',
      });
    }

    // 2. إجراء التبديل بين وضع التجربة والإنتاج (SWITCH)
    if (mode && ['DEMO', 'LIVE'].includes(mode)) {
      await prisma.systemSetting.upsert({
        where: { companyId: company.id },
        update: {
          environmentMode: mode,
        } as any,
        create: {
          companyId: company.id,
          environmentMode: mode,
        } as any,
      });

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'SWITCH_ENVIRONMENT_MODE',
          entity: 'SystemSetting',
          newValue: mode,
          reason: mode === 'LIVE' ? 'تفعيل وضع الإنتاج والعمل الحقيقي' : 'التحويل لوضع التجربة والاختبار',
        },
      });

      return NextResponse.json({
        success: true,
        mode,
        message: mode === 'LIVE' ? 'تم التبديل للبيئة الحقيقية للإنتاج 🟢' : 'تم التبديل لبيئة التجربة والاختبار 🧪',
      });
    }

    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  } catch (error: any) {
    console.error('Environment switch error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة طلب البيئة' }, { status: 500 });
  }
}
