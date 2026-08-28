import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';
import { ensureChatForNeed } from '../route';

/**
 * POST /api/group-chat/members
 *  Client only. Body: { userId: <agent user id>, needId?: string, groupChatId?: string }
 *  - If groupChatId is provided, adds to that specific chat (must be owned by the client).
 *  - Else if needId is provided, ensures the per-need chat exists and adds there.
 *  - Else returns 400 (no longer falls back to "the client's single chat").
 *
 *  Adds an agent to the chat (idempotent). Notifies the agent that they were added.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'client') return NextResponse.json({ error: 'Client only' }, { status: 403 });

    const body = await req.json();
    const targetUserId = body?.userId;
    if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const needId = (body?.needId || '').toString() || undefined;
    const groupChatId = (body?.groupChatId || '').toString() || undefined;
    if (!needId && !groupChatId) {
      return NextResponse.json({ error: 'needId or groupChatId required' }, { status: 400 });
    }

    // Validate the target is an agent
    const target = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, role: true, isActive: true },
    });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.role !== 'agent') return NextResponse.json({ error: 'Only agents can be added' }, { status: 400 });

    // Resolve the chat
    let chat;
    if (groupChatId) {
      chat = await db.groupChat.findUnique({ where: { id: groupChatId } });
      if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      if (chat.clientId !== auth.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    } else if (needId) {
      // Verify the need belongs to this client
      const clientRow = await db.client.findUnique({ where: { userId: auth.userId }, select: { id: true } });
      if (!clientRow) return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
      const need = await db.callCenterNeed.findUnique({ where: { id: needId }, select: { id: true, title: true, clientId: true } });
      if (!need) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      if (need.clientId !== clientRow.id) return NextResponse.json({ error: 'This job does not belong to your account' }, { status: 403 });
      chat = await ensureChatForNeed(auth.userId, needId, 'Team Chat: ' + need.title);
    } else {
      return NextResponse.json({ error: 'needId or groupChatId required' }, { status: 400 });
    }

    const existing = await db.groupChatMember.findUnique({
      where: { groupChatId_userId: { groupChatId: chat.id, userId: targetUserId } },
    });

    if (!existing) {
      await db.groupChatMember.create({
        data: { groupChatId: chat.id, userId: targetUserId, addedById: auth.userId },
      });
    }

    // Resolve the client's company name for the notification
    const clientRow = await db.client.findUnique({
      where: { userId: auth.userId },
      select: { companyName: true },
    });
    const ownerName = clientRow?.companyName || 'A call center';

    // Notify the agent (in-app + push). Only send if newly added.
    if (!existing) {
      try {
        await createNotification({
          userId: targetUserId,
          title: 'Added to Team Chat',
          message: ownerName + ' added you to a team group chat.',
          type: 'group_chat',
          pushBody: ownerName + ' added you to their team group chat. Tap to open.',
          pushUrl: 'https://167.86.124.101:4001/#group-chat',
        });
      } catch (notifErr) {
        console.error('[group-chat/members POST] notification failed:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      groupChatId: chat.id,
      needId: chat.needId,
      alreadyMember: !!existing,
    });
  } catch (error) {
    console.error('POST /api/group-chat/members error:', error);
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
  }
}

/**
 * DELETE /api/group-chat/members?userId=<agent user id>&groupChatId=<chat id>
 *  Client only. Removes an agent from the specified group chat.
 *  groupChatId is REQUIRED now (clients have multiple chats).
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'client') return NextResponse.json({ error: 'Client only' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');
    const groupChatId = searchParams.get('groupChatId');
    if (!targetUserId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (!groupChatId) return NextResponse.json({ error: 'groupChatId required' }, { status: 400 });

    const chat = await db.groupChat.findUnique({ where: { id: groupChatId } });
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    if (chat.clientId !== auth.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    await db.groupChatMember.deleteMany({
      where: { groupChatId: chat.id, userId: targetUserId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/group-chat/members error:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
}
