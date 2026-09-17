import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'غير مصرح للوصول إلى سجل التدقيق الإداري' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';
    const entity = searchParams.get('entity') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const where: any = {};

    if (action && action !== 'ALL') {
      where.action = action;
    }

    if (entity && entity !== 'ALL') {
      where.entity = entity;
    }

    if (search.trim()) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { employee: { firstName: { contains: search, mode: 'insensitive' } } } },
        { user: { employee: { lastName: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              employee: {
                select: {
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Audit Log Fetch Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء جلب سجلات التدقيق' }, { status: 500 });
  }
}
