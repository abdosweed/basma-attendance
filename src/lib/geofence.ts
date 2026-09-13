/**
  حساب المسافة الجغرافية بدقة بين نقطتين على الكرة الأرضية باستخدام معادلة Haversine
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_METERS = 6371000; // نصف قطر الأرض بالمتر

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distanceInMeters = EARTH_RADIUS_METERS * c;
  return Math.round(distanceInMeters * 10) / 10; // تقريب لأقرب جزء من عشرة للمتر
}

export interface GeofenceValidationResult {
  isAllowed: boolean;
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
  reason?: string;
  isSuspicious?: boolean;
}

export function validateEmployeeLocation(
  userLat: number,
  userLng: number,
  accuracy: number,
  maxAllowedAccuracy: number,
  authorizedBranches: Array<{ id: string; name: string; latitude: number; longitude: number; geofenceRadius: number }>,
  allowOutsideBranch: boolean = false
): GeofenceValidationResult {
  // 1. فحص دقة الـ GPS
  if (accuracy > maxAllowedAccuracy) {
    return {
      isAllowed: false,
      matchedBranch: null,
      nearestBranch: null,
      distanceMeters: null,
      reason: `تعذر تحديد موقعك بدقة كافية (الدقة الحالية: ${Math.round(accuracy)} متر، الحد المسموح: ${maxAllowedAccuracy} متر). انتظر قليلًا وحاول مرة أخرى.`,
      isSuspicious: true,
    };
  }

  // 2. إذا كان مسموحاً للموظف بالعمل خارج الفروع
  if (allowOutsideBranch) {
    const firstBranch = authorizedBranches[0] || null;
    return {
      isAllowed: true,
      matchedBranch: firstBranch
        ? { id: firstBranch.id, name: firstBranch.name, geofenceRadius: firstBranch.geofenceRadius }
        : null,
      nearestBranch: null,
      distanceMeters: 0,
      reason: 'مسموح لك بالتسجيل خارج نطاق الفروع بناءً على صلاحية موظف ميداني.',
    };
  }

  if (!authorizedBranches || authorizedBranches.length === 0) {
    return {
      isAllowed: false,
      matchedBranch: null,
      nearestBranch: null,
      distanceMeters: null,
      reason: 'لا يوجد فروع مسموح لك بالتسجيل منها. يرجى مراجعة إدارة الموارد البشرية.',
    };
  }

  let nearestBranchInfo: { id: string; name: string; distanceMeters: number; geofenceRadius: number } | null = null;
  let minDistance = Infinity;
  let matchedBranchInfo: { id: string; name: string; geofenceRadius: number } | null = null;

  for (const branch of authorizedBranches) {
    const distance = calculateHaversineDistance(userLat, userLng, branch.latitude, branch.longitude);

    if (distance < minDistance) {
      minDistance = distance;
      nearestBranchInfo = {
        id: branch.id,
        name: branch.name,
        distanceMeters: distance,
        geofenceRadius: branch.geofenceRadius,
      };
    }

    if (distance <= branch.geofenceRadius) {
      matchedBranchInfo = {
        id: branch.id,
        name: branch.name,
        geofenceRadius: branch.geofenceRadius,
      };
      break;
    }
  }

  if (matchedBranchInfo) {
    return {
      isAllowed: true,
      matchedBranch: matchedBranchInfo,
      nearestBranch: nearestBranchInfo,
      distanceMeters: minDistance,
    };
  }

  return {
    isAllowed: false,
    matchedBranch: null,
    nearestBranch: nearestBranchInfo,
    distanceMeters: minDistance,
    reason: `أنت خارج نطاق موقع العمل المسموح. المسافة عن أقرب فرع (${nearestBranchInfo?.name}): ${Math.round(minDistance)} متر، بينما النطاق المسموح: ${nearestBranchInfo?.geofenceRadius} متر.`,
    isSuspicious: minDistance > (nearestBranchInfo?.geofenceRadius || 100) * 3, // محاولة مشبوهة إذا كان أبعد بـ 3 أضعاف النطاق
  };
}
