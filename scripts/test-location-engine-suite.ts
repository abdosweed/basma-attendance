import { evaluateLocationConfidence, GPSReading, LocationEngineSettings } from '../src/lib/geofence';

interface TestCase {
  id: number;
  name: string;
  readings: GPSReading[];
  allowOutsideBranch?: boolean;
  settings?: Partial<LocationEngineSettings>;
  expectedState: string;
  description: string;
}

const BRANCH = [
  {
    id: 'b1',
    name: 'الفرع الرئيسي',
    latitude: 24.7136,
    longitude: 46.6753,
    geofenceRadius: 30,
  },
];

// 1 degree latitude ~ 111320 meters
const metersToLat = (meters: number) => 24.7136 + meters / 111320;

const now = Date.now();

const testCases: TestCase[] = [
  {
    id: 1,
    name: 'اختبار داخل النطاق المؤكد (INSIDE_CONFIRMED)',
    readings: [
      { latitude: metersToLat(10), longitude: 46.6753, accuracy: 8, timestamp: now },
    ],
    settings: { maxAcceptableAccuracy: 30 },
    expectedState: 'INSIDE_CONFIRMED',
    description: 'المسافة 10m والدقة 8m ضمن نصف القطر 30m',
  },
  {
    id: 2,
    name: 'اختبار حد النطاق (29.9m - INSIDE_CONFIRMED)',
    readings: [
      { latitude: metersToLat(29.9), longitude: 46.6753, accuracy: 10, timestamp: now },
    ],
    settings: { maxAcceptableAccuracy: 30 },
    expectedState: 'INSIDE_CONFIRMED',
    description: 'المسافة 29.9m على الحدود تماماً والدقة 10m',
  },
  {
    id: 3,
    name: 'اختبار حد النطاق (30.0m - INSIDE_CONFIRMED)',
    readings: [
      { latitude: metersToLat(30.0), longitude: 46.6753, accuracy: 10, timestamp: now },
    ],
    settings: { maxAcceptableAccuracy: 30 },
    expectedState: 'INSIDE_CONFIRMED',
    description: 'المسافة 30.0m مطابقة تماماً لنصف القطر',
  },
  {
    id: 4,
    name: 'اختبار منطقة الشك (UNCERTAIN)',
    readings: [
      { latitude: metersToLat(40.0), longitude: 46.6753, accuracy: 15, timestamp: now },
    ],
    settings: { geofenceRadius: 30, uncertaintyZoneEnd: 60, maxAcceptableAccuracy: 30 },
    expectedState: 'UNCERTAIN',
    description: 'المسافة 40m تقع في منطقة عدم التأكد (30m - 60m)',
  },
  {
    id: 5,
    name: 'اختبار خارج النطاق بوضوح (OUTSIDE_CONFIRMED)',
    readings: [
      { latitude: metersToLat(80.0), longitude: 46.6753, accuracy: 10, timestamp: now },
    ],
    settings: { exitThreshold: 60, maxAcceptableAccuracy: 30 },
    expectedState: 'OUTSIDE_CONFIRMED',
    description: 'المسافة 80m تتجاوز حد الخروج 60m والدقة 10m',
  },
  {
    id: 6,
    name: 'اختبار عدة قراءات خارجية متتالية (OUTSIDE_CONFIRMED)',
    readings: [
      { latitude: metersToLat(72.0), longitude: 46.6753, accuracy: 10, timestamp: now - 3000 },
      { latitude: metersToLat(75.0), longitude: 46.6753, accuracy: 11, timestamp: now - 2000 },
      { latitude: metersToLat(78.0), longitude: 46.6753, accuracy: 9, timestamp: now },
    ],
    settings: { exitThreshold: 60, minimumExitReadings: 3, maxAcceptableAccuracy: 30 },
    expectedState: 'OUTSIDE_CONFIRMED',
    description: '3 قراءات متتالية خارج الحد الأدنى للخروج 60m',
  },
  {
    id: 7,
    name: 'اختبار دقة GPS ضعيفة جداً (LOCATION_UNAVAILABLE)',
    readings: [
      { latitude: metersToLat(15.0), longitude: 46.6753, accuracy: 80, timestamp: now },
    ],
    settings: { maxAcceptableAccuracy: 30 },
    expectedState: 'LOCATION_UNAVAILABLE',
    description: 'المسافة 15m لكن الدقة 80m تتجاوز الحد الأقصى المقبول 30m',
  },
  {
    id: 8,
    name: 'منع توسيع النطاق بسبب Accuracy (50m - 25m <= 30m)',
    readings: [
      { latitude: metersToLat(50.0), longitude: 46.6753, accuracy: 25, timestamp: now },
    ],
    settings: { geofenceRadius: 30, uncertaintyZoneEnd: 60, maxAcceptableAccuracy: 30 },
    expectedState: 'UNCERTAIN',
    description: 'المسافة 50m والدقة 25m (عدم استخدام 50-25<=30 للقبول المباشر)',
  },
  {
    id: 9,
    name: 'اختبار استبعاد القراءات الشاذة (Outlier Handling)',
    readings: [
      { latitude: metersToLat(28.0), longitude: 46.6753, accuracy: 10, timestamp: now - 4000 },
      { latitude: metersToLat(31.0), longitude: 46.6753, accuracy: 10, timestamp: now - 3000 },
      { latitude: metersToLat(29.0), longitude: 46.6753, accuracy: 10, timestamp: now - 2000 },
      { latitude: metersToLat(120.0), longitude: 46.6753, accuracy: 10, timestamp: now - 1000 }, // Outlier!
      { latitude: metersToLat(30.0), longitude: 46.6753, accuracy: 10, timestamp: now },
    ],
    settings: { geofenceRadius: 30, maxAcceptableAccuracy: 30 },
    expectedState: 'INSIDE_CONFIRMED',
    description: 'المسافة الوسيطة (Median) تحمي من قراءة شاذة واحدة 120m',
  },
  {
    id: 10,
    name: 'اختبار التذبذب حول الحدود (Hysteresis/Stability)',
    readings: [
      { latitude: metersToLat(28.0), longitude: 46.6753, accuracy: 10, timestamp: now - 4000 },
      { latitude: metersToLat(32.0), longitude: 46.6753, accuracy: 10, timestamp: now - 3000 },
      { latitude: metersToLat(29.0), longitude: 46.6753, accuracy: 10, timestamp: now - 2000 },
      { latitude: metersToLat(34.0), longitude: 46.6753, accuracy: 10, timestamp: now - 1000 },
      { latitude: metersToLat(27.0), longitude: 46.6753, accuracy: 10, timestamp: now },
    ],
    settings: { geofenceRadius: 30, maxAcceptableAccuracy: 30 },
    expectedState: 'INSIDE_CONFIRMED',
    description: 'تذبذب طفيف حول الحد 30m؛ المسافة الوسيطة 29m تمنع التغير المتكرر للحالة',
  },
  {
    id: 11,
    name: 'اختبار الموظف الميداني (AUTHORIZED_OUTSIDE)',
    readings: [
      { latitude: metersToLat(500.0), longitude: 46.6753, accuracy: 15, timestamp: now },
    ],
    allowOutsideBranch: true,
    expectedState: 'AUTHORIZED_OUTSIDE',
    description: 'موظف مصرح له بالعمل الميداني خارج نطاق الفروع',
  },
  {
    id: 12,
    name: 'اختبار تعليق التتبع (MONITORING_SUSPENDED)',
    readings: [
      { latitude: metersToLat(10.0), longitude: 46.6753, accuracy: 10, timestamp: now },
    ],
    settings: { isMonitoringSuspended: true },
    expectedState: 'MONITORING_SUSPENDED',
    description: 'تعليق التتبع خارج أوقات العمل الرسمية أو أثناء العطلات',
  },
];

export function runValidationSuite() {
  console.log('=============== 🧪 PHASE 2: LOCATION CONFIDENCE ENGINE VALIDATION SUITE ===============\n');

  let passedCount = 0;

  testCases.forEach((tc) => {
    const res = evaluateLocationConfidence(tc.readings, BRANCH, tc.allowOutsideBranch || false, tc.settings);

    const isPass = res.state === tc.expectedState;
    if (isPass) passedCount++;

    const statusBadge = isPass ? '✅ PASS' : '❌ FAIL';

    console.log(`Test #${tc.id}: ${tc.name}`);
    console.log(`Description: ${tc.description}`);
    console.log(`  Expected State : ${tc.expectedState}`);
    console.log(`  Actual State   : ${res.state}`);
    console.log(`  Median Distance: ${res.medianDistance}m`);
    console.log(`  Best Accuracy  : ${res.bestAccuracy}m`);
    console.log(`  Confidence Score: ${res.confidenceScore}/100`);
    console.log(`  Readings Count : ${res.readingsCount}`);
    console.log(`  Result Status  : ${statusBadge}\n`);
  });

  console.log(`SUMMARY: ${passedCount}/${testCases.length} Tests PASSED.`);

  if (passedCount === testCases.length) {
    console.log('🎉 Location Confidence Engine logic is 100% VALIDATED & CONFIRMED!');
  } else {
    console.error('❌ Validation suite failed. Fix underlying logic before proceeding.');
    process.exit(1);
  }
}

runValidationSuite();
