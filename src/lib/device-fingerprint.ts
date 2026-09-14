/**
 * حاسبة ومولد بصمة الجهاز الفريدة الموثوقة للموظف (Client Device Fingerprinting)
 */

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'SERVER_SIDE';

  const STORAGE_KEY = 'basma_trusted_device_uuid';
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    // إنشاء UUID فريد وثابت للهاتف عند أول زيارة
    const randomHex = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    deviceId = `DEV-${Date.now().toString(36)}-${randomHex}`;
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  return deviceId;
}

export function getDeviceInfo() {
  if (typeof window === 'undefined') {
    return { browser: 'Unknown', os: 'Unknown', deviceName: 'Unknown' };
  }

  const ua = navigator.userAgent;
  let os = 'Windows';
  if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS (iPhone)';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Mac')) os = 'macOS';

  let browser = 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';

  const deviceName = `${os} - ${browser}`;

  return { browser, os, deviceName };
}
