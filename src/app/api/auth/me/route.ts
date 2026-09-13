import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuthenticatedUser();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      employee: {
        include: {
          primaryBranch: true,
          company: true,
          department: true,
          employeeShifts: {
            include: { shift: true },
          },
          employeeBranches: {
            include: { branch: true },
          },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 404 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      employee: user.employee,
    },
  });
}
