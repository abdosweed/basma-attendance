/**
 * Core Reporting RBAC & Permission Resolver - Basma Attendance System v1.14.0
 * Phase 12B.1 Core Reporting Engine
 */

import { UserSessionPayload } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export interface ScopedReportingFilter {
  companyId: string;
  employeeIds?: string[];
  branchIds?: string[];
  isForbidden?: boolean;
}

/**
 * Requirement 28: Enforces Server-Side RBAC Filtering
 * SUPER_ADMIN: All data across company
 * ADMIN: All company data
 * HR: All company data
 * BRANCH_MANAGER: Only permitted branches (primaryBranchId or mapped branches)
 * EMPLOYEE: Only own employeeId
 */
export async function getScopedReportingFilter(
  session: UserSessionPayload,
  requestedBranchId?: string,
  requestedEmployeeId?: string
): Promise<ScopedReportingFilter> {
  const { role, userId, companyId: sessionCompanyId } = session;

  // Resolve employee record for current user if available
  const userEmployee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true, companyId: true, primaryBranchId: true },
  });

  const companyId = sessionCompanyId || userEmployee?.companyId;

  if (!companyId) {
    return { companyId: '', isForbidden: true };
  }

  // 1. SUPER_ADMIN / ADMIN / HR
  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'HR') {
    const filter: ScopedReportingFilter = { companyId };
    if (requestedBranchId) filter.branchIds = [requestedBranchId];
    if (requestedEmployeeId) filter.employeeIds = [requestedEmployeeId];
    return filter;
  }

  // 2. BRANCH_MANAGER
  if (role === 'BRANCH_MANAGER') {
    if (!userEmployee) return { companyId, isForbidden: true };

    // Get mapped branches from EmployeeBranch table
    const mappedBranches = await prisma.employeeBranch.findMany({
      where: { employeeId: userEmployee.id },
      select: { branchId: true },
    });

    const permittedBranchIds = new Set<string>();
    if (userEmployee.primaryBranchId) {
      permittedBranchIds.add(userEmployee.primaryBranchId);
    }
    mappedBranches.forEach((b) => permittedBranchIds.add(b.branchId));

    const branchList = Array.from(permittedBranchIds);

    if (requestedBranchId) {
      if (!permittedBranchIds.has(requestedBranchId)) {
        // Direct API manipulation attempt! Block query.
        return { companyId, isForbidden: true };
      }
      return { companyId, branchIds: [requestedBranchId] };
    }

    if (requestedEmployeeId) {
      // Verify employee belongs to manager's branch
      const targetEmp = await prisma.employee.findUnique({
        where: { id: requestedEmployeeId },
        select: { primaryBranchId: true },
      });
      if (!targetEmp || !targetEmp.primaryBranchId || !permittedBranchIds.has(targetEmp.primaryBranchId)) {
        return { companyId, isForbidden: true };
      }
      return { companyId, employeeIds: [requestedEmployeeId], branchIds: branchList };
    }

    return { companyId, branchIds: branchList };
  }

  // 3. EMPLOYEE
  if (role === 'EMPLOYEE') {
    if (!userEmployee) return { companyId, isForbidden: true };

    // Employee can ONLY query their own employeeId!
    if (requestedEmployeeId && requestedEmployeeId !== userEmployee.id) {
      return { companyId, isForbidden: true };
    }

    return { companyId, employeeIds: [userEmployee.id] };
  }

  return { companyId, isForbidden: true };
}
