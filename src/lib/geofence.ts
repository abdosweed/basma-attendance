/**
 * حاسبة وتدقيق الـ Strict Geofence ودرجة دقة GPS
 */

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_METERS = 6371000; // 6371000 meters exactly

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceInMeters = EARTH_RADIUS_METERS * c;
  return Math.round(distanceInMeters * 10) / 10;
}

export interface GPSReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * خوارزمية التثبيت واختيار أفضل قراءة GPS واكتشاف القراءات الشاذة (Outliers)
 */
export function filterAndSelectBestGPSReading(
  readings: GPSReading[],
  maxAgeSeconds: number = 15
): GPSReading | null {
  if (!readings || readings.length === 0) return null;

  const now = Date.now();
  // 1. استبعاد القراءات القديمة
  const freshReadings = readings.filter((r) => {
    const ageSeconds = (now - r.timestamp) / 1000;
    return ageSeconds <= maxAgeSeconds && r.accuracy > 0;
  });

  if (freshReadings.length === 0) return null;
  if (freshReadings.length === 1) return freshReadings[0];

  // 2. اكتشاف واستبعاد القراءات الشاذة (Outlier Detection)
  const avgLat = freshReadings.reduce((sum, r) => sum + r.latitude, 0) / freshReadings.length;
  const avgLng = freshReadings.reduce((sum, r) => sum + r.longitude, 0) / freshReadings.length;

  const validReadings = freshReadings.filter((r) => {
    const distFromAvg = calculateHaversineDistance(r.latitude, r.longitude, avgLat, avgLng);
    return distFromAvg <= 200;
  });

  const pool = validReadings.length > 0 ? validReadings : freshReadings;

  // 3. اختيار القراءة ذات أفضل (أدنى) accuracy
  pool.sort((a, b) => a.accuracy - b.accuracy);
  return pool[0];
}

export interface GeofenceValidationResult {
  isAllowed: boolean;
  code: 'SUCCESS' | 'OUTSIDE_GEOFENCE' | 'POOR_GPS_ACCURACY' | 'NO_BRANCH' | 'FIELD_EMPLOYEE';
  matchedBranch: {
    id: string;
    name: string;
    geofenceRadius: number;
  } | null;
  nearestBranch: {
    id: string;
    name: string;
    distanceMeters: number;
    geofenceRadius: number;
  } | null;
  distanceMeters: number | null;
  accuracyMeters: number;
  reason?: string;
  isSuspicious?: boolean;
}

export function validateEmployeeLocation(
  userLat: number,
  userLng: number,
  accuracy: number,
  maxAcceptedGpsAccuracy: number,
  authorizedBranches: Array<{ id: string; name: string; latitude: number; longitude: number; geofenceRadius: number }>,
  allowOutsideBranch: boolean = false,
  accuracyMustBeWithinRadius: boolean = false,
  validationMode: 'STRICT' | 'ACCURACY_AWARE' = 'STRICT'
): GeofenceValidationResult {
  // 1. فحص الحد الأقصى لدقة الـ GPS
  if (accuracy > maxAcceptedGpsAccuracy) {
    return {
      isAllowed: false,
      code: 'POOR_GPS_ACCURACY',
      matchedBranch: null,
      nearestBranch: null,
      distanceMeters: null,
      accuracyMeters: accuracy,
      reason: `دقة موقعك الحالية غير كافية (±${Math.round(accuracy)} متر، الحد الأقصى المسموح: ±${maxAcceptedGpsAccuracy} متر). انتظر قليلًا لترشيح الدقة وحاول مجددًا.`,
      isSuspicious: true,
    };
  }

  // 2. موظف ميداني مصرح خارج الفروع
  if (allowOutsideBranch) {
    const firstBranch = authorizedBranches[0] || null;
    return {
      isAllowed: true,
      code: 'FIELD_EMPLOYEE',
      matchedBranch: firstBranch
        ? { id: firstBranch.id, name: firstBranch.name, geofenceRadius: firstBranch.geofenceRadius }
        : null,
      nearestBranch: null,
      distanceMeters: 0,
      accuracyMeters: accuracy,
      reason: 'مسموح لك بالتسجيل خارج نطاق الفروع بناءً على صلاحية موظف ميداني.',
    };
  }

  if (!authorizedBranches || authorizedBranches.length === 0) {
    return {
      isAllowed: false,
      code: 'NO_BRANCH',
      matchedBranch: null,
      nearestBranch: null,
      distanceMeters: null,
      accuracyMeters: accuracy,
      reason: 'لا يوجد فروع مصرح لك بالتسجيل منها. يرجى مراجعة إدارة الموارد البشرية.',
    };
  }

  let nearestBranchInfo: { id: string; name: string; distanceMeters: number; geofenceRadius: number } | null = null;
  let minDistance = Infinity;
  let matchedBranchInfo: { id: string; name: string; geofenceRadius: number } | null = null;

  for (const branch of authorizedBranches) {
    const parsedRadius = Number(branch.geofenceRadius);
    const distance = calculateHaversineDistance(userLat, userLng, Number(branch.latitude), Number(branch.longitude));

    if (distance < minDistance) {
      minDistance = distance;
      nearestBranchInfo = {
        id: branch.id,
        name: branch.name,
        distanceMeters: distance,
        geofenceRadius: parsedRadius,
      };
    }

    // تطبيق فحص Strict Geofence
    if (distance <= parsedRadius) {
      if (accuracyMustBeWithinRadius && accuracy > parsedRadius) {
        return {
          isAllowed: false,
          code: 'POOR_GPS_ACCURACY',
          matchedBranch: null,
          nearestBranch: {
            id: branch.id,
            name: branch.name,
            distanceMeters: distance,
            geofenceRadius: parsedRadius,
          },
          distanceMeters: distance,
          accuracyMeters: accuracy,
          reason: `دقة الـ GPS لديك (±${Math.round(accuracy)} متر) تتجاوز نطاق الفرع (${parsedRadius} متر). يرجى تحسين دقة الموقع أولاً.`,
        };
      }

      matchedBranchInfo = {
        id: branch.id,
        name: branch.name,
        geofenceRadius: parsedRadius,
      };
      break;
    }
  }

  if (matchedBranchInfo) {
    return {
      isAllowed: true,
      code: 'SUCCESS',
      matchedBranch: matchedBranchInfo,
      nearestBranch: nearestBranchInfo,
      distanceMeters: minDistance,
      accuracyMeters: accuracy,
    };
  }

  return {
    isAllowed: false,
    code: 'OUTSIDE_GEOFENCE',
    matchedBranch: null,
    nearestBranch: nearestBranchInfo,
    distanceMeters: minDistance,
    accuracyMeters: accuracy,
    reason: `أنت خارج نطاق موقع العمل. المسافة الحالية عن فرع ${nearestBranchInfo?.name}: ${Math.round(minDistance)} متر، بينما النطاق المسموح الصارم: ${nearestBranchInfo?.geofenceRadius} متر.`,
    isSuspicious: minDistance > (nearestBranchInfo?.geofenceRadius || 100) * 3,
  };
}
