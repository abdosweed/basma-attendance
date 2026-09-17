import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { OfflineAttendanceEvent } from '@/lib/offline-sync';

export async function POST(request: NextRequest) {
  try {
    const userSession = await getAuthenticatedUser();
    if (!userSession) {
      return NextResponse.json({ error: 'غير مصرح لرفع الحركات المعلقة' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: userSession.userId },
      include: { primaryBranch: true },
    });

    if (!employee) {
      return NextResponse.json({ error: 'لم يتم العثور على ملف الموظف' }, { status: 404 });
    }

    const body = await request.json();
    const events: OfflineAttendanceEvent[] = body.events || [];

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ success: true, syncedIds: [], message: 'لا توجد حركات للمزامنة' });
    }

    const syncedIds: string[] = [];
    const nowMs = Date.now();
    const maxFutureMs = nowMs + 10 * 60 * 1000; // 10 minutes clock skew buffer
    const maxPastMs = nowMs - 7 * 24 * 60 * 60 * 1000; // 7 days max past buffer

    for (const event of events) {
      const clientTimeMs = new Date(event.timestamp).getTime();

      // التحقق الصارم من التوقيت الأصلي وعدم التلاعب بالمؤشر الزمني
      if (isNaN(clientTimeMs) || clientTimeMs > maxFutureMs || clientTimeMs < maxPastMs) {
        console.warn(`[Offline Sync] Rejected suspicious timestamp for event ${event.id}: ${event.timestamp}`);
        continue;
      }

      const originalDate = new Date(event.timestamp);
      const dateStr = originalDate.toLocaleDateString('en-CA', { timeZone: 'Africa/Tripoli' });

      // جلب أو إنشاء سجل اليوم
      let record = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: employee.id,
          date: dateStr,
        },
      });

      if (!record) {
        record = await prisma.attendanceRecord.create({
          data: {
            employeeId: employee.id,
            branchId: employee.primaryBranchId,
            date: dateStr,
            status: 'PRESENT',
            checkInAt: event.type === 'CHECK_IN' ? originalDate : null,
            checkOutAt: event.type === 'CHECK_OUT' ? originalDate : null,
            notes: 'بصمة موثقة ومزامنة محلياً عند انقطاع الشبكة (Offline Sync)',
          },
        });
      } else {
        const updateData: any = {};
        if (event.type === 'CHECK_IN' && !record.checkInAt) {
          updateData.checkInAt = originalDate;
        } else if (event.type === 'CHECK_OUT') {
          updateData.checkOutAt = originalDate;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.attendanceRecord.update({
            where: { id: record.id },
            data: updateData,
          });
        }
      }

      // إضافة حدث الحضور المزامَن
      await prisma.attendanceEvent.create({
        data: {
          employeeId: employee.id,
          branchId: employee.primaryBranchId,
          type: event.type,
          serverTimestamp: originalDate,
          latitude: event.latitude,
          longitude: event.longitude,
          accuracy: event.accuracy,
          deviceId: event.deviceId,
          source: 'OFFLINE_SYNC',
          status: 'OFFLINE_SYNCED',
          notes: `مزامنة بصمة محليّة بحالة offline (ID: ${event.id})`,
        },
      });

      // توثيق عملية المزامنة في سجل التدقيق الإداري AuditLog
      await prisma.auditLog.create({
        data: {
          userId: userSession.userId,
          action: 'OFFLINE_SYNC',
          entity: 'ATTENDANCE',
          entityId: record.id,
          reason: `مزامنة بصمة محليّة بحالة offline (النوع: ${event.type})`,
          details: {
            offlineId: event.id,
            originalTimestamp: event.timestamp,
            dateStr,
            coords: { latitude: event.latitude, longitude: event.longitude },
          },
        },
      });

      syncedIds.push(event.id);
    }

    return NextResponse.json({
      success: true,
      syncedIds,
      syncedCount: syncedIds.length,
      message: `تمت مزامنة ${syncedIds.length} حركة بصمة معلقة بنجاح 🟢`,
    });
  } catch (error: any) {
    console.error('Offline Sync API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء مزامنة البصمات المحلية' }, { status: 500 });
  }
}
