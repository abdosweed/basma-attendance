import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { evaluateLocationConfidence } from '@/lib/geofence';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح للوصول. يرجى تسجيل الدخول.' }, { status: 401 });
    }

    const body = await request.json();
    const { operationType = 'CHECK_IN', latitude, longitude, accuracy, readings } = body;

    if (latitude === undefined || longitude === undefined || accuracy === undefined) {
      return NextResponse.json({ error: 'إحداثيات الموقع الجغرافي مطلوبة.' }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: {
        company: {
          include: { systemSettings: true },
        },
        employeeBranches: {
          include: { branch: true },
        },
        primaryBranch: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'بيانات الموظف غير موجودة.' }, { status: 404 });
    }

    const settings = employee.company.systemSettings[0];
    const allowVerification = settings?.allowManagerVerificationInUncertaintyZone ?? true;
    const maxVerificationDistance = settings?.managerVerificationMaxDistance ?? 60.0;

    if (!allowVerification) {
      return NextResponse.json({ error: 'خاصية طلب تأكيد الموقع من الإدارة غير مفعلة بالنظام.' }, { status: 403 });
    }

    // 1. إعادة تقييم ثقة الموقع سيرفر-سايد لمنع أي تلاعب
    const authorizedBranches = employee.employeeBranches.map((eb) => eb.branch).concat(employee.primaryBranch ? [employee.primaryBranch] : []);
    const sampleReadings = Array.isArray(readings) && readings.length > 0
      ? readings
      : [{ latitude, longitude, accuracy, timestamp: Date.now() }];

    const assessment = evaluateLocationConfidence(
      sampleReadings,
      authorizedBranches,
      employee.allowOutsideBranch
    );

    // 2. الضوابط والأمان: يمنع الطلب إذا كانت الحالة خارج النطاق بوضوح أو المسافة أكبر من الحد الأقصى للمراجعة
    if (assessment.state === 'OUTSIDE_CONFIRMED' || assessment.medianDistance > maxVerificationDistance) {
      return NextResponse.json(
        {
          error: `لا يمكن تقديم طلب تأكيد إداري للمواقع البعيدة جداً. المسافة الحالية (${Math.round(assessment.medianDistance)}m) تتجاوز الحد الأقصى المسموح لطلب التأكيد (${maxVerificationDistance}m).`,
        },
        { status: 403 }
      );
    }

    if (assessment.state === 'INSIDE_CONFIRMED') {
      return NextResponse.json(
        { message: 'أنت في موقع مؤكد بالفعل داخل الفرع، يمكنك التسجيل مباشرة بدون طلب تأكيد.' },
        { status: 400 }
      );
    }

    // 3. منع الطلبات المكررة (إذا كان هناك طلب PENDING قائم لنفس الموظف)
    const existingPending = await prisma.locationVerificationRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error: 'يوجد طلب تأكيد موقع قيد المراجعة حالياً لدى الإدارة.',
          requestId: existingPending.id,
        },
        { status: 400 }
      );
    }

    // 4. فحص معدل التكرار (Rate Limiting: 3 طلبات خلال 15 دقيقة)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentRequestsCount = await prisma.locationVerificationRequest.count({
      where: {
        employeeId: employee.id,
        createdAt: { gte: fifteenMinutesAgo },
      },
    });

    if (recentRequestsCount >= 3) {
      return NextResponse.json(
        { error: 'تجاوزت الحد الأقصى لطلبات التأكيد (3 طلبات خلال 15 دقيقة). يرجى الانتظار.' },
        { status: 429 }
      );
    }

    // 5. إنشاء طلب التأكيد
    const verificationRequest = await prisma.locationVerificationRequest.create({
      data: {
        employeeId: employee.id,
        branchId: assessment.nearestBranch?.id || null,
        operationType,
        latitude,
        longitude,
        accuracy: assessment.bestAccuracy,
        distanceMeters: assessment.medianDistance,
        confidenceScore: assessment.confidenceScore,
        locationState: assessment.state,
        status: 'PENDING',
      },
    });

    // 6. إرسال إشعارات للإدارة والمدراء
    const managers = await prisma.user.findMany({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'] },
        isActive: true,
      },
      include: { employee: true },
    });

    for (const m of managers) {
      if (m.employee) {
        try {
          await prisma.notification.create({
            data: {
              employeeId: m.employee.id,
              title: 'طلب تأكيد موقع جغرافي',
              message: `طلب تأكيد موقع للموظف ${employee.firstName} ${employee.lastName} (${operationType}) - المسافة: ${Math.round(assessment.medianDistance)}m`,
              type: 'WARNING',
            },
          });
        } catch (e) {}
      }
    }

    // 7. توثيق سجل الأمان
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'LOCATION_VERIFICATION_REQUESTED',
        entity: 'LocationVerificationRequest',
        entityId: verificationRequest.id,
        newValue: JSON.stringify({
          employeeId: employee.id,
          operationType,
          distanceMeters: assessment.medianDistance,
          accuracy: assessment.bestAccuracy,
          confidenceScore: assessment.confidenceScore,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم إرسال طلب تأكيد الموقع إلى الإدارة بنجاح، بانتظار المراجعة.',
      requestId: verificationRequest.id,
      status: 'PENDING',
    });
  } catch (error: any) {
    console.error('Location verification request error:', error);
    return NextResponse.json({ error: 'حدث خطأ في السيرفر أثناء تقديم طلب التأكيد' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // تحديث تلقائي للطلبات التي تجاوزت 5 دقائق لتصبح EXPIRED
    await prisma.locationVerificationRequest.updateMany({
      where: {
        status: 'PENDING',
        requestedAt: { lt: fiveMinutesAgo },
      },
      data: { status: 'EXPIRED' },
    });

    let whereClause: any = {};
    if (session.role === 'BRANCH_MANAGER' && session.employeeId) {
      const emp = await prisma.employee.findUnique({ where: { id: session.employeeId } });
      if (emp?.primaryBranchId) {
        whereClause.branchId = emp.primaryBranchId;
      }
    } else if (session.role === 'EMPLOYEE') {
      whereClause.employeeId = session.employeeId;
    }

    const requests = await prisma.locationVerificationRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            jobTitle: true,
            department: { select: { name: true } },
          },
        },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ error: 'تعذر جلب طلبات التأكيد' }, { status: 500 });
  }
}
