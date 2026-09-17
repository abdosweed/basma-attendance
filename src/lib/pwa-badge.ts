/**
 * PWA App Badging API Helper (App Badging API)
 * يعكس عدد الإشعارات وطلبات الاعتماد المعلقة مباشرة على أيقونة التطبيق بشاشة الهاتف وعنوان المتصفح
 */

export function setAppBadge(count: number) {
  if (typeof window === 'undefined') return;

  try {
    const badgeCount = Math.max(0, Math.floor(count));

    if (badgeCount > 0) {
      // 1. تحديث شارة التطبيق الأصلية في iOS PWA و Android PWA
      if ('setAppBadge' in navigator && typeof (navigator as any).setAppBadge === 'function') {
        (navigator as any).setAppBadge(badgeCount).catch(() => {});
      }

      // 2. تحديث عنوان التبويب ديناميكياً
      const baseTitle = 'بصمة – Basma Attendance';
      document.title = `(${badgeCount}) ${baseTitle}`;
    } else {
      clearAppBadge();
    }
  } catch (err) {
    console.error('Failed to set PWA app badge:', err);
  }
}

export function clearAppBadge() {
  if (typeof window === 'undefined') return;

  try {
    // 1. تفريغ الشارة الرقمية
    if ('clearAppBadge' in navigator && typeof (navigator as any).clearAppBadge === 'function') {
      (navigator as any).clearAppBadge().catch(() => {});
    }

    // 2. إعادة العنوان الأصلي
    document.title = 'بصمة – Basma Attendance';
  } catch (err) {
    console.error('Failed to clear PWA app badge:', err);
  }
}
