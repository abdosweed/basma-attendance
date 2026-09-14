import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET endpoint required by ZKTeco ADMS to verify handshake
export async function GET(request: Request) {
  return new NextResponse('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// POST endpoint to receive real-time push attendance logs from ZKTeco devices
export async function POST(request: Request) {
  try {
    const textData = await request.text();
    console.log('ZKTeco raw push log payload:', textData);

    // ZKTeco format parsing: e.g., "1\t2026-09-14 16:00:00\t0\t1..." (Pin \t Timestamp \t Status \t Verification)
    const lines = textData.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split('\t');
      if (parts.length >= 2) {
        const empNum = parts[0].trim();
        const timestampStr = parts[1].trim();

        // 1. البحث عن الموظف بالرقم الوظيفي
        const employee = await prisma.employee.findFirst({
          where: {
            OR: [
              { employeeNumber: empNum },
              { user: { phone: empNum } },
            ],
          },
          include: { primaryBranch: true },
        });

        if (employee) {
          const timestamp = new Date(timestampStr || Date.now());
          const eventType = parts[2] === '1' ? 'CHECK_OUT' : 'CHECK_IN';

          // 2. تسجيل حدث البصمة فوراً من جهاز ZKTeco الجداري
          await prisma.attendanceEvent.create({
            data: {
              employeeId: employee.id,
              branchId: employee.primaryBranchId || undefined,
              type: eventType,
              serverTimestamp: timestamp,
              latitude: employee.primaryBranch?.latitude || 0,
              longitude: employee.primaryBranch?.longitude || 0,
              accuracy: 1.0,
              distanceFromBranch: 0,
            },
          });

          console.log(`✅ ZKTeco punch logged for ${employee.firstName} ${employee.lastName} (${eventType})`);
        }
      }
    }

    return new NextResponse('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  } catch (error: any) {
    console.error('ZKTeco push integration error:', error);
    return new NextResponse('OK', { status: 200 });
  }
}
