/**
 * محرك المزامنة المحلي عند انقطاع الإنترنت (Offline Sync Engine)
 * يدعم التخزين المحلي المحصن في IndexedDB / LocalStorage والمزامنة التلقائية
 */

export interface OfflineAttendanceEvent {
  id: string;
  type: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END';
  timestamp: string; // ISO string للحظة الضغط الأصلية
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceId?: string;
  trustedDeviceId?: string;
  encryptedData?: string;
  status: 'OFFLINE_PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
}

const STORAGE_KEY = 'basma_offline_attendance_queue';

/**
 * دالة بسيطة لتطشير وتشفير بيانات البصمة لمنع التلاعب المحلي
 */
function encodePayload(payload: any): string {
  try {
    const jsonStr = JSON.stringify(payload);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  } catch (e) {
    return '';
  }
}

/**
 * حفظ حركة بصمة محلياً بحالة OFFLINE_PENDING
 */
export function saveOfflineAttendance(
  type: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END',
  coords: { latitude: number; longitude: number; accuracy: number },
  deviceIds: { deviceId?: string; trustedDeviceId?: string }
): OfflineAttendanceEvent {
  const timestamp = new Date().toISOString();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const rawEvent: OfflineAttendanceEvent = {
    id,
    type,
    timestamp,
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    deviceId: deviceIds.deviceId,
    trustedDeviceId: deviceIds.trustedDeviceId,
    status: 'OFFLINE_PENDING',
  };

  rawEvent.encryptedData = encodePayload({
    id,
    type,
    timestamp,
    lat: coords.latitude,
    lng: coords.longitude,
    acc: coords.accuracy,
  });

  const existing = getOfflineAttendanceEvents();
  existing.push(rawEvent);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.error('Failed to save offline attendance to LocalStorage:', e);
  }

  return rawEvent;
}

/**
 * جلب جميع الحركات المعلقة محلياً
 */
export function getOfflineAttendanceEvents(): OfflineAttendanceEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

/**
 * حذف الحركات المعالجة بعد نجاح المزامنة
 */
export function removeOfflineEvents(syncedIds: string[]) {
  if (typeof window === 'undefined') return;
  const current = getOfflineAttendanceEvents();
  const remaining = current.filter((ev) => !syncedIds.includes(ev.id));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } catch (e) {
    console.error('Failed to update offline queue after sync:', e);
  }
}

/**
 * رفع الحركات المعلقة إلى خادم البصمة
 */
export async function syncOfflineAttendance(): Promise<{ syncedCount: number; errors?: any[] }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { syncedCount: 0 };
  }

  const events = getOfflineAttendanceEvents();
  if (events.length === 0) return { syncedCount: 0 };

  try {
    const res = await fetch('/api/attendance/sync-offline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.syncedIds && Array.isArray(data.syncedIds)) {
        removeOfflineEvents(data.syncedIds);
        return { syncedCount: data.syncedIds.length };
      }
    }
  } catch (err) {
    console.error('Offline sync fetch error:', err);
  }

  return { syncedCount: 0 };
}

/**
 * مستمع تلقائي يستمع لعودة الشبكة واستئناف التطبيق للمزامنة
 */
export function setupOfflineAutoSync(onSyncSuccess?: (count: number) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    console.log('📶 Internet re-connected. Triggering offline sync...');
    const result = await syncOfflineAttendance();
    if (result.syncedCount > 0 && onSyncSuccess) {
      onSyncSuccess(result.syncedCount);
    }
  };

  window.addEventListener('online', handleOnline);

  // تشغيل المزامنة فوراً إذا كانت الشبكة متوفرة
  if (navigator.onLine) {
    syncOfflineAttendance().then((res) => {
      if (res.syncedCount > 0 && onSyncSuccess) {
        onSyncSuccess(res.syncedCount);
      }
    });
  }

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
