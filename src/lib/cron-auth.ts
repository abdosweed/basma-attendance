import { NextRequest } from 'next/server';

/**
 * دالة التحقق من الرمز السري لحماية مسارات المهام المجدولة (Cron Endpoint Security Guard)
 */
export function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || 'basma_production_cron_secret_2026';

  // 1. فحص ترويسة التفويض (Authorization: Bearer <CRON_SECRET>)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token === cronSecret) return true;
  }

  // 2. فحص معلمة الطلب في الرابط (?secret=<CRON_SECRET>)
  const { searchParams } = new URL(request.url);
  const paramSecret = searchParams.get('secret');
  if (paramSecret === cronSecret) return true;

  // 3. فحص الترويسة المخصصة (x-cron-secret)
  const customHeaderSecret = request.headers.get('x-cron-secret');
  if (customHeaderSecret === cronSecret) return true;

  return false;
}
