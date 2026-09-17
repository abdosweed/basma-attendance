/**
 * وحدة حماية وتحصين الموقع الجغرافي مكافحة التزييف (Anti-Spoofing & Geolocation Security Guard)
 */

import { calculateHaversineDistance } from './geofence';

export interface LocationQualityResult {
  isValid: boolean;
  reason?: string;
  isMock: boolean;
  accuracy: number;
}

export interface SpeedCheckResult {
  isSuspicious: boolean;
  calculatedSpeedKmH?: number;
  reason?: string;
}

const LAST_GEO_STORAGE_KEY = 'basma_last_verified_geo_checkpoint';

/**
 * 1. فحص سمات كائن الجغرافيا وكشف التزييف المحلي (Client-Side Mock Detection)
 */
export function validateClientLocationQuality(coords: {
  latitude: number;
  longitude: number;
  accuracy: number;
  isMock?: boolean;
}): LocationQualityResult {
  const { accuracy, isMock } = coords;

  // فحص راية التزييف المباشرة من المتصفح/الجهاز (Mock Location Flag)
  if (isMock === true) {
    return {
      isValid: false,
      isMock: true,
      accuracy,
      reason: '⚠️ تم رصد استخدام موقع وهمي (Mock Location Active). يرجى إيقاف برامج التزييف.',
    };
  }

  // رفض البصمات ذات الدقة المشبوهة أو المصطنعة صفرية
  if (accuracy <= 0) {
    return {
      isValid: false,
      isMock: true,
      accuracy,
      reason: '⚠️ إحداثيات موقع مشبوهة بدقة صفرية مصطنعة (Invalid Zero Accuracy).',
    };
  }

  // رفض الدقة الضعيفة جداً التي تتجاوز 100 متر بدون مبرر
  if (accuracy > 100) {
    return {
      isValid: false,
      isMock: false,
      accuracy,
      reason: `⚠️ دقة موقع ضعيفة جداً (±${Math.round(accuracy)} متر). الحد الأقصى المسموح 100 متر.`,
    };
  }

  return {
    isValid: true,
    isMock: false,
    accuracy,
  };
}

/**
 * 2. كشف السرعات والتنقل المستحيل بين القراءات (Impossible Speed & Jump Detection)
 */
export function detectImpossibleSpeed(
  newLat: number,
  newLng: number,
  newTimestamp: number = Date.now()
): SpeedCheckResult {
  if (typeof window === 'undefined') {
    return { isSuspicious: false };
  }

  try {
    const rawSaved = localStorage.getItem(LAST_GEO_STORAGE_KEY);
    const now = newTimestamp;

    if (rawSaved) {
      const lastPoint = JSON.parse(rawSaved);
      const timeDiffSeconds = (now - lastPoint.timestamp) / 1000;

      // فحص الفارق الزمني (فقط إذا كانت القراءة السابقة خلال آخر ساعتين)
      if (timeDiffSeconds > 0 && timeDiffSeconds < 7200) {
        const distanceMeters = calculateHaversineDistance(
          lastPoint.latitude,
          lastPoint.longitude,
          newLat,
          newLng
        );

        // سرعة التنقل بالكيلومتر/ساعة
        const speedKmH = (distanceMeters / 1000) / (timeDiffSeconds / 3600);

        // إذا كانت السرعة تتجاوز 150 كم/ساعة والمسافة تزيد عن 500 متر
        if (speedKmH > 150 && distanceMeters > 500) {
          return {
            isSuspicious: true,
            calculatedSpeedKmH: Math.round(speedKmH),
            reason: `⚠️ تم رصد سرعة تنقل غير منطقية (${Math.round(speedKmH)} كم/ساعة لمسافة ${Math.round(distanceMeters)} متر خلال ${Math.round(timeDiffSeconds)} ثانية).`,
          };
        }
      }
    }

    // حفظ القراءة الحالية كمرجع للمحاولة القادمة
    localStorage.setItem(
      LAST_GEO_STORAGE_KEY,
      JSON.stringify({
        latitude: newLat,
        longitude: newLng,
        timestamp: now,
      })
    );
  } catch (e) {
    console.error('Error checking impossible speed:', e);
  }

  return { isSuspicious: false };
}
