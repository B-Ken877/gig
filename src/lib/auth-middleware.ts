import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract the user ID from the X-User-Id header (set by the SPA client).
 * Returns null if no user header is present.
 */
export function getUserId(req: NextRequest): string | null {
  return req.headers.get('X-User-Id');
}

/**
 * Extract the user role from the X-User-Role header (set by the SPA client).
 */
export function getUserRole(req: NextRequest): string | null {
  return req.headers.get('X-User-Role');
}

/**
 * Get authenticated user info from headers.
 * Returns { userId, role } on success, or { error, status } on failure.
 * Used by API routes that need both userId and role.
 */
export async function getAuth(req: NextRequest): Promise<
  | { userId: string; role: string }
  | { error: string; status: number }
> {
  const userId = getUserId(req);
  const role = getUserRole(req);

  if (!userId || !role) {
    return { error: 'Authentication required', status: 401 };
  }

  return { userId, role };
}

/**
 * Require the request to come from a user with one of the allowed roles.
 * Throws if the user is not authenticated or not in the allowed roles.
 */
export async function requireRole(req: NextRequest, allowedRoles: string[]): Promise<void> {
  const userId = getUserId(req);
  const role = getUserRole(req);

  if (!userId || !role) {
    throw new Error('Unauthorized');
  }

  if (!allowedRoles.includes(role)) {
    throw new Error('Forbidden');
  }
}
