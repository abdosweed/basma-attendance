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
  const assessment = evaluateLocationConfidence(
    [{ latitude: userLat, longitude: userLng, accuracy, timestamp: Date.now() }],
    authorizedBranches,
    allowOutsideBranch,
    { maxAcceptableAccuracy: maxAcceptedGpsAccuracy }
  );

  const isAllowed = assessment.state === 'INSIDE_CONFIRMED' || assessment.state === 'AUTHORIZED_OUTSIDE';

  return {
    isAllowed,
    code: isAllowed
      ? assessment.state === 'AUTHORIZED_OUTSIDE'
        ? 'FIELD_EMPLOYEE'
        : 'SUCCESS'
      : assessment.state === 'LOCATION_UNAVAILABLE'
      ? 'POOR_GPS_ACCURACY'
      : 'OUTSIDE_GEOFENCE',
    matchedBranch: assessment.matchedBranch,
    nearestBranch: assessment.nearestBranch,
    distanceMeters: assessment.medianDistance,
    accuracyMeters: accuracy,
    reason: assessment.reason,
    isSuspicious: assessment.state === 'OUTSIDE_CONFIRMED',
  };
}

export type LocationState =
  | 'INSIDE_CONFIRMED'
  | 'UNCERTAIN'
  | 'OUTSIDE_CONFIRMED'
  | 'LOCATION_UNAVAILABLE'
  | 'AUTHORIZED_OUTSIDE'
  | 'MONITORING_SUSPENDED';

export interface LocationEngineSettings {
  geofenceRadius: number; // e.g. 30m
  uncertaintyZoneEnd: number; // e.g. 60m
  exitThreshold: number; // e.g. 60m
  returnThreshold: number; // e.g. 30m
  minimumExitReadings: number; // e.g. 3
  minimumReturnReadings: number; // e.g. 2
  maxAcceptableAccuracy: number; // e.g. 80m
  isMonitoringSuspended?: boolean;
}

export interface LocationConfidenceAssessment {
  state: LocationState;
  confidenceScore: number; // 0 to 100
  bestAccuracy: number;
  medianDistance: number;
  stabilityScore: number;
  readingsCount: number;
  reason: string;
  matchedBranch: { id: string; name: string; geofenceRadius: number } | null;
  nearestBranch: { id: string; name: string; distanceMeters: number; geofenceRadius: number } | null;
}

export const DEFAULT_LOCATION_ENGINE_SETTINGS: LocationEngineSettings = {
  geofenceRadius: 30,
  uncertaintyZoneEnd: 60,
  exitThreshold: 60,
  returnThreshold: 30,
  minimumExitReadings: 3,
  minimumReturnReadings: 2,
  maxAcceptableAccuracy: 80,
  isMonitoringSuspended: false,
};

/**
 * محرك ثقة الموقع Multi-sample Location Confidence Engine
 */
export function evaluateLocationConfidence(
  readings: GPSReading[],
  authorizedBranches: Array<{ id: string; name: string; latitude: number; longitude: number; geofenceRadius: number }>,
  allowOutsideBranch: boolean = false,
  customSettings?: Partial<LocationEngineSettings>
): LocationConfidenceAssessment {
  const settings: LocationEngineSettings = { ...DEFAULT_LOCATION_ENGINE_SETTINGS, ...customSettings };

  if (settings.isMonitoringSuspended) {
    const first = authorizedBranches[0] || null;
    return {
      state: 'MONITORING_SUSPENDED',
      confidenceScore: 100,
      bestAccuracy: 0,
      medianDistance: 0,
      stabilityScore: 100,
      readingsCount: readings.length,
      reason: '⚪ تتبع الموقع الجغرافي متوقف حالياً خارج أوقات العمل الرسمية أو أثناء الإجازات.',
      matchedBranch: first ? { id: first.id, name: first.name, geofenceRadius: first.geofenceRadius } : null,
      nearestBranch: null,
    };
  }

  if (allowOutsideBranch) {
    const first = authorizedBranches[0] || null;
    return {
      state: 'AUTHORIZED_OUTSIDE',
      confidenceScore: 100,
      bestAccuracy: readings[0]?.accuracy || 10,
      medianDistance: 0,
      stabilityScore: 100,
      readingsCount: readings.length,
      reason: 'مسموح لك بالتسجيل خارج نطاق الفروع بناءً على صلاحية موظف ميداني.',
      matchedBranch: first ? { id: first.id, name: first.name, geofenceRadius: first.geofenceRadius } : null,
      nearestBranch: null,
    };
  }

  if (!readings || readings.length === 0) {
    return {
      state: 'LOCATION_UNAVAILABLE',
      confidenceScore: 0,
      bestAccuracy: 999,
      medianDistance: 9999,
      stabilityScore: 0,
      readingsCount: 0,
      reason: 'تعذر الحصول على قراءات إشارات الـ GPS من الهاتف.',
      matchedBranch: null,
      nearestBranch: null,
    };
  }

  // 1. تصفية القراءات واستبعاد الشاذة (Outliers)
  const validReadings = readings.filter((r) => r.accuracy > 0);
  if (validReadings.length === 0) {
    return {
      state: 'LOCATION_UNAVAILABLE',
      confidenceScore: 0,
      bestAccuracy: 999,
      medianDistance: 9999,
      stabilityScore: 0,
      readingsCount: 0,
      reason: 'إشارة الـ GPS غير موثوقة تماماً.',
      matchedBranch: null,
      nearestBranch: null,
    };
  }

  const bestAccuracy = Math.min(...validReadings.map((r) => r.accuracy));

  // إذا كانت الدقة ضعيفة جداً وتتجاوز الحد المسموح
  if (bestAccuracy > settings.maxAcceptableAccuracy) {
    return {
      state: 'LOCATION_UNAVAILABLE',
      confidenceScore: 15,
      bestAccuracy,
      medianDistance: 9999,
      stabilityScore: 10,
      readingsCount: validReadings.length,
      reason: `دقة إشارة الـ GPS غير كافية (±${Math.round(bestAccuracy)}m). الحد الأقصى المقبول: ±${settings.maxAcceptableAccuracy}m.`,
      matchedBranch: null,
      nearestBranch: null,
    };
  }

  // 2. حساب المسافات لأقرب فرع لكل قراءة
  let nearestBranchObj: { id: string; name: string; distanceMeters: number; geofenceRadius: number } | null = null;
  let minAverageDist = Infinity;
  let matchedBranchObj: { id: string; name: string; geofenceRadius: number } | null = null;

  for (const branch of authorizedBranches) {
    const branchRadius = Number(branch.geofenceRadius) || settings.geofenceRadius;
    const distances = validReadings.map((r) =>
      calculateHaversineDistance(r.latitude, r.longitude, Number(branch.latitude), Number(branch.longitude))
    );

    // حساب الوسيط (Median Distance)
    const sortedDist = [...distances].sort((a, b) => a - b);
    const medianDist = sortedDist[Math.floor(sortedDist.length / 2)];

    if (medianDist < minAverageDist) {
      minAverageDist = medianDist;
      nearestBranchObj = {
        id: branch.id,
        name: branch.name,
        distanceMeters: medianDist,
        geofenceRadius: branchRadius,
      };
    }

    if (medianDist <= branchRadius) {
      matchedBranchObj = {
        id: branch.id,
        name: branch.name,
        geofenceRadius: branchRadius,
      };
      break;
    }
  }

  // 3. حساب معامل الاستقرارية (Stability Score)
  const distancesFromFirst = validReadings.map((r) =>
    calculateHaversineDistance(r.latitude, r.longitude, validReadings[0].latitude, validReadings[0].longitude)
  );
  const maxSpread = Math.max(...distancesFromFirst);
  const stabilityScore = Math.max(0, Math.min(100, Math.round(100 - maxSpread * 2)));

  // 4. حساب درجة الثقة الشاملة (Confidence Score 0-100)
  let confidenceScore = 50;
  if (bestAccuracy <= 20) confidenceScore += 25;
  else if (bestAccuracy <= 50) confidenceScore += 15;

  if (validReadings.length >= 3) confidenceScore += 15;
  confidenceScore += Math.round(stabilityScore * 0.1);
  confidenceScore = Math.min(100, Math.max(0, confidenceScore));

  const effectiveRadius = nearestBranchObj?.geofenceRadius || settings.geofenceRadius;
  const uncertaintyEnd = Math.max(settings.uncertaintyZoneEnd, effectiveRadius * 1.8);

  // 5. اتخاذ القرار المعماري بناءً على قواعد التداخل الهستيري (Hysteresis Logic)
  if (minAverageDist <= effectiveRadius && bestAccuracy <= settings.maxAcceptableAccuracy) {
    return {
      state: 'INSIDE_CONFIRMED',
      confidenceScore,
      bestAccuracy,
      medianDistance: minAverageDist,
      stabilityScore,
      readingsCount: validReadings.length,
      reason: `🟢 تم التأكد من وجودك داخل نطاق ${nearestBranchObj?.name || 'العمل'} بنجاح (المسافة: ${Math.round(minAverageDist)}m).`,
      matchedBranch: matchedBranchObj || (nearestBranchObj ? { id: nearestBranchObj.id, name: nearestBranchObj.name, geofenceRadius: effectiveRadius } : null),
      nearestBranch: nearestBranchObj,
    };
  }

  if (minAverageDist > effectiveRadius && minAverageDist <= uncertaintyEnd) {
    return {
      state: 'UNCERTAIN',
      confidenceScore: Math.round(confidenceScore * 0.6),
      bestAccuracy,
      medianDistance: minAverageDist,
      stabilityScore,
      readingsCount: validReadings.length,
      reason: `🟠 موقعك الحالي غير مؤكد تماماً (المسافة التقريبية: ${Math.round(minAverageDist)}m من فرع ${nearestBranchObj?.name}). جارٍ طلب التأكيد الإداري أو إعادة التثبيت.`,
      matchedBranch: null,
      nearestBranch: nearestBranchObj,
    };
  }

  return {
    state: 'OUTSIDE_CONFIRMED',
    confidenceScore,
    bestAccuracy,
    medianDistance: minAverageDist,
    stabilityScore,
    readingsCount: validReadings.length,
    reason: `🔴 أنت خارج نطاق موقع العمل المؤكد. المسافة الحالية عن فرع ${nearestBranchObj?.name}: ${Math.round(minAverageDist)}m (النطاق المصرح: ${effectiveRadius}m).`,
    matchedBranch: null,
    nearestBranch: nearestBranchObj,
  };
}
