import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

/**
 * POST /api/applications/hire
 *  Client only. Body: { agentId: string, needId: string, needTitle?: string }
 *
 *  Effect (PER-JOB scoping):
 *    1. Ensures a group chat exists for (clientId, needId) — lazy creation,
 *       one chat per job/need, NOT one per client.
 *    2. Adds the agent as a member of that chat (idempotent).
 *    3. Posts a system-style message in the chat: "X hired Y for Z".
 *    4. Sends the agent an in-app + push notification "You've been hired by Y".
 *
 *  Returns: { success, groupChatId, alreadyMember, needId }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'client') return NextResponse.json({ error: 'Client only' }, { status: 403 });

    const body = await req.json();
    const agentUserId = body?.agentId;
    if (!agentUserId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    let needId = (body?.needId || '').toString();
    let needTitle = (body?.needTitle || '').toString();

    // Validate agent
    const agent = await db.user.findUnique({
      where: { id: agentUserId },
      select: { id: true, name: true, role: true },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (agent.role !== 'agent') return NextResponse.json({ error: 'Target user is not an agent' }, { status: 400 });

    // Resolve the client's company name
    const clientRow = await db.client.findUnique({
      where: { userId: auth.userId },
      select: { id: true, companyName: true },
    });
    const ownerName = clientRow?.companyName || 'A call center';

    // If needId missing, try to resolve from needTitle + clientId as a fallback.
    // (Hard reject if we can't determine the job — we never want to fall back to
    // the legacy "one chat per client" behavior, which was the original bug.)
    if (!needId) {
      if (!needTitle) {
        return NextResponse.json({
          error: 'needId (or needTitle) is required — every hire must be scoped to a specific job.',
        }, { status: 400 });
      }
      const need = await db.callCenterNeed.findFirst({
        where: { clientId: clientRow?.id || '', title: needTitle },
        select: { id: true, title: true },
      });
      if (!need) {
        return NextResponse.json({
          error: 'Could not resolve which job this hire is for. Please reload the Applications page and try again.',
        }, { status: 400 });
      }
      needId = need.id;
      needTitle = need.title;
    } else {
      // Verify the need exists and belongs to this client
      const need = await db.callCenterNeed.findUnique({
        where: { id: needId },
        select: { id: true, title: true, clientId: true },
      });
      if (!need) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      if (clientRow && need.clientId !== clientRow.id) {
        return NextResponse.json({ error: 'This job does not belong to your account' }, { status: 403 });
      }
      if (!needTitle) needTitle = need.title;
    }

    // 1. Ensure group chat exists FOR THIS NEED (one per client+need)
    const existingChat = await db.groupChat.findUnique({
      where: { clientId_needId: { clientId: auth.userId, needId } },
    });
    const chat = existingChat ?? await db.groupChat.create({
      data: {
        clientId: auth.userId,
        needId,
        title: needTitle ? ('Team Chat: ' + needTitle).slice(0, 120) : 'Team Chat',
      },
    });

    // 2. Add agent as member (idempotent)
    const existing = await db.groupChatMember.findUnique({
      where: { groupChatId_userId: { groupChatId: chat.id, userId: agentUserId } },
    });
    if (!existing) {
      await db.groupChatMember.create({
        data: { groupChatId: chat.id, userId: agentUserId, addedById: auth.userId },
      });
    }

    // 3. Post a system-style message in the chat
    const hireLine = needTitle
      ? ownerName + ' hired ' + (agent.name || 'an agent') + ' for "' + needTitle + '".'
      : ownerName + ' hired ' + (agent.name || 'an agent') + '.';
    await db.groupChatMessage.create({
      data: {
        groupChatId: chat.id,
        senderId: auth.userId,
        senderRole: 'client',
        content: hireLine,
      },
    });
    await db.groupChat.update({
      where: { id: chat.id },
      data: { updatedAt: new Date() },
    });

    // 4. Notify the agent (in-app + push)
    try {
      await createNotification({
        userId: agentUserId,
        title: 'You\'ve Been Hired!',
        message: ownerName + ' hired you' + (needTitle ? ' for "' + needTitle + '"' : '') + '. You\'ve been added to their team chat for this job.',
        type: 'hire',
        pushBody: ownerName + ' hired you' + (needTitle ? ' for "' + needTitle + '"' : '') + '. Tap to open your team chat.',
        pushUrl: 'https://167.86.124.101:4001/#group-chat',
      });
    } catch (notifErr) {
      console.error('[applications/hire POST] notification failed:', notifErr);
    }

    return NextResponse.json({
      success: true,
      groupChatId: chat.id,
      needId,
      needTitle,
      alreadyMember: !!existing,
    });
  } catch (error) {
    console.error('POST /api/applications/hire error:', error);
    return NextResponse.json({ error: 'Failed to hire agent' }, { status: 500 });
  }
}
