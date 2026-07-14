import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth-middleware';

// POST /api/users/approve — Approve or reject a pending user account (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);

    const { userId, action } = await req.json();

    if (!userId || !['approve', 'reject', 'suspend', 'activate'].includes(action)) {
      return NextResponse.json(
        { error: 'userId and a valid action (approve, reject, suspend, activate) are required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let isActive = user.isActive;
    let accountStatus = user.accountStatus;

    switch (action) {
      case 'approve':
        isActive = true;
        accountStatus = 'active';
        break;
      case 'reject':
        isActive = false;
        accountStatus = 'rejected';
        break;
      case 'suspend':
        isActive = false;
        accountStatus = 'suspended';
        break;
      case 'activate':
        isActive = true;
        accountStatus = 'active';
        break;
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { isActive, accountStatus },
    });

    // Create notification for the user about the account status change
    const messages: Record<string, string> = {
      approve: 'Your account has been approved! You can now log in.',
      reject: 'Your account registration has been rejected. Please contact support for more information.',
      suspend: 'Your account has been suspended. Please contact the administrator.',
      activate: 'Your account has been re-activated.',
    };

    await db.notification.create({
      data: {
        userId: updated.id,
        title: `Account ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : action === 'suspend' ? 'Suspended' : 'Re-activated'}`,
        message: messages[action],
        type: 'application',
        channel: 'in-app',
      },
    });

    return NextResponse.json({
      message: `User account ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'suspend' ? 'suspended' : 're-activated'} successfully.`,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        isActive: updated.isActive,
        accountStatus: updated.accountStatus,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 401 });
    }
    console.error('POST /api/users/approve error:', error);
    return NextResponse.json({ error: 'Failed to update account status' }, { status: 500 });
  }
}

// GET /api/users/approve — List pending-approval users (admin only)
export async function GET(req: NextRequest) {
  try {
    await requireRole(req, ['admin']);

    const pendingUsers = await db.user.findMany({
      where: {
        accountStatus: 'pending_approval',
      },
      include: {
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users: pendingUsers });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 401 });
    }
    console.error('GET /api/users/approve error:', error);
    return NextResponse.json({ error: 'Failed to fetch pending users' }, { status: 500 });
  }
}
