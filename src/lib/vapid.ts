import webpush from 'web-push';

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

// Fallback development VAPID keys if env vars are not set
const DEFAULT_VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa45g086V21yV4352-7Y1y9J1qf6g0ZJ5_p27725916-43h42y26J235-J3758';
const DEFAULT_VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'K7y1-477526_p27725916_43h42y26J235_J3758';
const DEFAULT_VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@basma-attendance.com';

let isConfigured = false;

export function getVapidConfig(): VapidConfig {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

  return { publicKey, privateKey, subject };
}

export function ensureVapidConfigured(): boolean {
  if (isConfigured) return true;

  try {
    const config = getVapidConfig();
    webpush.setVapidDetails(
      config.subject,
      config.publicKey,
      config.privateKey
    );
    isConfigured = true;
    return true;
  } catch (error) {
    console.error('Failed to configure VAPID details for Web Push:', error);
    return false;
  }
}
