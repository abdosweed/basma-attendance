import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'basma-secure-jwt-secret-key-2026-production'
);

const TOKEN_COOKIE_NAME = 'basma_session_token';

// المسارات المعزولة التي تتطلب تسجيل الدخول
const PROTECTED_ROUTES = ['/admin', '/employee', '/hr', '/manager'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = (payload as any).role;

    // منع الموظف العادي من الدخول إلى لوحة التحكم الإدارية /admin
    if (pathname.startsWith('/admin') && role === 'EMPLOYEE') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  } catch (err) {
    // التوكين غير صالح أو منتهي الصلاحية
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/admin/:path*', '/employee/:path*', '/hr/:path*', '/manager/:path*'],
};
