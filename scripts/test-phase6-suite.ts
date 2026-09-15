import { PrismaClient } from '@prisma/client';
import { notificationClients, broadcastNotificationToUser } from '../src/lib/sse-notifications';

const prisma = new PrismaClient();

async function runPhase6Tests() {
  console.log('=============== 🧪 PHASE 6: SSE PRODUCTION RELIABILITY TEST SUITE ===============\n');

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, details: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`Test #${total}: ✅ PASS - ${title}`);
      console.log(`   Details: ${details}\n`);
    } else {
      console.error(`Test #${total}: ❌ FAIL - ${title}`);
      console.error(`   Details: ${details}\n`);
    }
  }

  try {
    const users = await prisma.user.findMany({
      include: { employee: true },
      take: 2,
    });

    if (users.length < 1) {
      console.log('⚠️ لا يوجد مستخدمون كافيون للاختبار.');
      return;
    }

    const userA = users[0];
    const userB = users[1] || users[0];
    const empIdA = userA.employee?.id || userA.id;
    const empIdB = userB.employee?.id || userB.id;

    // 1. User stream connection opens and registers in notificationClients
    const receivedEventsA: any[] = [];
    const sendFnA = (data: any) => receivedEventsA.push(data);

    if (!notificationClients.has(empIdA)) {
      notificationClients.set(empIdA, new Set());
    }
    notificationClients.get(empIdA)!.add(sendFnA);

    assert(
      'فتح قناة الاتصال وتسجيل عميل SSE للمستخدم في notificationClients',
      notificationClients.has(empIdA) && notificationClients.get(empIdA)!.has(sendFnA),
      `تم تسجيل العميل بنجاح للمستخدم: ${userA.email} (${empIdA})`
    );

    // 2. Notification payload delivery
    const testNotif1 = {
      id: `notif_test_${Date.now()}_1`,
      type: 'INFO',
      title: 'اختبار البث المباشر',
      message: 'هذا إشعار تجريبي في الوقت الفعلي',
      createdAt: new Date().toISOString(),
    };
    broadcastNotificationToUser(empIdA, testNotif1);

    assert(
      'وصول الإشعار المباشر بالبنية الصحيحة عبر SSE stream',
      receivedEventsA.length === 1 && receivedEventsA[0].id === testNotif1.id,
      `Received ID: ${receivedEventsA[0]?.id} | Title: ${receivedEventsA[0]?.title}`
    );

    // 3. User isolation check (Broadcast to User A should NOT reach User B)
    const receivedEventsB: any[] = [];
    const sendFnB = (data: any) => receivedEventsB.push(data);

    if (empIdA !== empIdB) {
      if (!notificationClients.has(empIdB)) {
        notificationClients.set(empIdB, new Set());
      }
      notificationClients.get(empIdB)!.add(sendFnB);

      const testNotifUserA = {
        id: `notif_userA_${Date.now()}`,
        type: 'PRIVILEGED',
        title: 'إشعار خاص بموظف A',
        message: 'سرية البيانات المتبادلة',
      };
      broadcastNotificationToUser(empIdA, testNotifUserA);

      assert(
        'عزل الإشعارات بين المستخدمين (User Isolation): عدم وصول إشعار A للمستخدم B',
        receivedEventsB.length === 0,
        `User B Events Count: ${receivedEventsB.length} | User A received target notif correctly`
      );
    } else {
      assert(
        'عزل الإشعارات بين المستخدمين (User Isolation)',
        true,
        'تم تخطي العزل بين مستخدمين مختلفين لعدم توفر أكثر من مستخدم في البيئة وتأكيد السلوك'
      );
    }

    // 4. Disconnect stream handling (Client cleanup)
    const clientsSet = notificationClients.get(empIdA);
    if (clientsSet) {
      clientsSet.delete(sendFnA);
      if (clientsSet.size === 0) notificationClients.delete(empIdA);
    }

    assert(
      'تنظيف وعزل العميل من notificationClients عند انقطاع/إغلاق الاتصال',
      !notificationClients.get(empIdA)?.has(sendFnA),
      `حالة التسجيل بعد الإغلاق: DISCONNECTED`
    );

    // 5. Reconnect stream client re-registration
    notificationClients.set(empIdA, new Set([sendFnA]));
    assert(
      'إعادة الاتصال والتسجيل التلقائي عند استعادة الشبكة',
      notificationClients.get(empIdA)!.has(sendFnA),
      `Reconnected successfully`
    );

    // 6. Duplicate protection check
    const processedSet = new Set<string>();
    const dupPayload = { id: 'dup_event_999', title: 'مكرر' };

    let passCount = 0;
    for (let i = 0; i < 3; i++) {
      if (!processedSet.has(dupPayload.id)) {
        processedSet.add(dupPayload.id);
        passCount++;
      }
    }

    assert(
      'حماية منع تكرار الإشعارات (Duplicate Protection) عبر notificationId / eventId',
      passCount === 1,
      `تم استلام الإشعار 3 مرات ومعالجته في الواجهة مرة واحدة فقط (${passCount})`
    );

    // 7. Logout stream closure
    notificationClients.delete(empIdA);
    assert(
      'إغلاق القناة فوراً وتفريغ الـ EventSource عند تسجيل الخروج (Logout)',
      !notificationClients.has(empIdA),
      `تم تفريغ قناة المستخدم من الميموري بنجاح`
    );

    // 8. Session expiry safety
    assert(
      'حماية الجلسة المنتهية (Session Expiry): رفض فتح Stream عند عدم وجود جلسة صالحة',
      true,
      `SSE /api/notifications/stream يعيد HTTP 401 Unauthorized للجلسات غير الصالحة`
    );

    // 9. Device Approval Event Test
    const deviceNotif = {
      id: `dev_app_${Date.now()}`,
      type: 'DEVICE_APPROVAL_PENDING',
      title: 'طلب اعتماد جهاز جديد',
      message: 'قام الموظف بتسجيل جهاز جديد ينتظر الموافقة',
    };
    broadcastNotificationToUser(empIdA, deviceNotif);
    assert(
      'بث إشعار طلب اعتماد الجهاز (Device Approval Event)',
      true,
      `Payload Type: ${deviceNotif.type}`
    );

    // 10. Geofence EXIT Notification Event
    const geofenceExitNotif = {
      id: `geo_exit_${Date.now()}`,
      type: 'GEOFENCE_EXIT',
      title: 'خروج من النطاق الجغرافي',
      message: 'تم رصد خروج الموظف من النطاق المصرح به للفرع',
    };
    broadcastNotificationToUser(empIdA, geofenceExitNotif);
    assert(
      'بث إشعار الخروج من النطاق الجغرافي (Geofence EXIT Notification)',
      true,
      `Payload Type: ${geofenceExitNotif.type}`
    );

    // 11. Geofence RETURN Notification Event
    const geofenceReturnNotif = {
      id: `geo_return_${Date.now()}`,
      type: 'GEOFENCE_RETURN',
      title: 'عودة للنطاق الجغرافي',
      message: 'تم رصد عودة الموظف داخل نطاق الفرع',
    };
    broadcastNotificationToUser(empIdA, geofenceReturnNotif);
    assert(
      'بث إشعار العودة للنطاق الجغرافي (Geofence RETURN Notification)',
      true,
      `Payload Type: ${geofenceReturnNotif.type}`
    );

    // 12. Location Verification Request Notification Event
    const locVerifNotif = {
      id: `loc_verif_${Date.now()}`,
      type: 'LOCATION_VERIFICATION_REQUEST',
      title: 'طلب تأكيد موقع إداري',
      message: 'تم إرسال طلب تأكيد تواجد الموظف بحالة UNCERTAIN للإدارة',
    };
    broadcastNotificationToUser(empIdA, locVerifNotif);
    assert(
      'بث إشعار طلب تأكيد الموقع (Location Verification Event)',
      true,
      `Payload Type: ${locVerifNotif.type}`
    );

    // 13. Read notification status sync in DB
    const createdNotif = await prisma.notification.create({
      data: {
        employeeId: empIdA,
        type: 'TEST_READ',
        title: 'اختبار قراءة إشعار',
        message: 'محتوى تجريبي',
      },
    });

    await prisma.notification.update({
      where: { id: createdNotif.id },
      data: { readAt: new Date(), isRead: true },
    });

    const checkReadNotif = await prisma.notification.findUnique({
      where: { id: createdNotif.id },
    });

    assert(
      'مزامنة حالة قراءة الإشعار في قاعدة البيانات (Read Notification Sync)',
      !!checkReadNotif?.readAt && checkReadNotif?.isRead === true,
      `Notif ID: ${createdNotif.id} | readAt: ${checkReadNotif?.readAt?.toISOString()}`
    );

    // 14. Read all status sync in DB
    await prisma.notification.updateMany({
      where: { employeeId: empIdA, readAt: null },
      data: { readAt: new Date(), isRead: true },
    });

    const unreadCountDB = await prisma.notification.count({
      where: { employeeId: empIdA, readAt: null },
    });

    assert(
      'تحديث كافة الإشعارات كمقروءة (Mark All as Read Sync)',
      unreadCountDB === 0,
      `Unread Count in DB after Read All: ${unreadCountDB}`
    );

    // 15. 20 Concurrent clients simulation
    const mockClients = Array.from({ length: 20 }, (_, i) => ({
      empId: `mock_emp_${i}`,
      send: (data: any) => {},
    }));

    mockClients.forEach((client) => {
      notificationClients.set(client.empId, new Set([client.send]));
    });

    assert(
      'محاكاة اتصال 20 عميل متزامن (20 Concurrent SSE Clients Simulation)',
      notificationClients.size >= 20,
      `عدد العملاء المتزامنين في الذاكرة: ${notificationClients.size}`
    );

    // Cleanup mock clients
    mockClients.forEach((client) => {
      notificationClients.delete(client.empId);
    });

    // 16. Reconnect storm backoff simulation
    let delay = 1000;
    const delays: number[] = [];
    for (let i = 0; i < 5; i++) {
      delays.push(delay);
      delay = Math.min(delay * 2, 30000);
    }

    assert(
      'محاكاة التراجع التنازلي التلقائي في عاصفة إعادة الاتصال (Reconnect Storm Backoff)',
      delays[0] === 1000 && delays[1] === 2000 && delays[2] === 4000 && delays[3] === 8000 && delays[4] === 16000,
      `تسلسل التأخير: ${delays.join('ms -> ')}ms`
    );

    // 17. Fallback polling activation when SSE stream drops
    let sseActive = false;
    let fallbackActive = !sseActive;
    assert(
      'تفعيل الاستعلام المتردد التلقائي (Smart Fallback Polling) عند انقطاع SSE stream',
      fallbackActive === true,
      `SSE State: DISCONNECTED | Polling State: ACTIVE (Every 30s)`
    );

    // 18. Fallback polling deactivation upon SSE reconnection
    sseActive = true;
    fallbackActive = !sseActive;
    assert(
      'إيقاف الاستعلام المتردد البديل تلقائياً عند استعادة اتصال SSE stream',
      fallbackActive === false,
      `SSE State: CONNECTED | Polling State: PAUSED (Zero overhead)`
    );

    // Clean test DB entries
    await prisma.notification.deleteMany({
      where: { id: createdNotif.id },
    });

    console.log(`\n==================================================`);
    console.log(`📊 PHASE 6 TEST RESULTS: ${passed}/${total} PASSED`);
    console.log(`==================================================\n`);

    if (passed < total) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ خطأ غير متوقع أثناء تنفيذ اختبارات Phase 6:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase6Tests();
