import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotificationBulk } from '@/lib/notifications';

/**
 * GET /api/group-chat/messages?groupChatId=<id>
 *  Returns the messages for the given group chat. The caller must be either
 *  the chat owner (client) or a member (agent).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId, role } = auth;

    const { searchParams } = new URL(req.url);
    const groupChatId = searchParams.get('groupChatId');
    if (!groupChatId) return NextResponse.json({ error: 'groupChatId required' }, { status: 400 });

    // Authorize: owner or member
    const chat = await db.groupChat.findUnique({
      where: { id: groupChatId },
      include: {
        client: { select: { id: true, name: true, avatar: true, verificationTiers: true, verifiedAt: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, avatar: true, verificationTiers: true, verifiedAt: true } },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });

    if (chat.clientId !== userId) {
      const member = await db.groupChatMember.findUnique({
        where: { groupChatId_userId: { groupChatId, userId } },
      });
      if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messages = await db.groupChatMessage.findMany({
      where: { groupChatId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    // Resolve sender display info (name + avatar + verification) for every message in one shot.
    // The client's company name is preferred when the sender is the call center.
    const senderIds = [...new Set(messages.map(m => m.senderId))];
    const senderUsers = senderIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, name: true, role: true, avatar: true, verificationTiers: true, verifiedAt: true },
        })
      : [];
    const senderClientRows = senderUsers.filter(u => u.role === 'client').length > 0
      ? await db.client.findMany({
          where: { userId: { in: senderUsers.filter(u => u.role === 'client').map(u => u.id) } },
          select: { userId: true, companyName: true },
        })
      : [];
    const clientNameMap = Object.fromEntries(senderClientRows.map(c => [c.userId, c.companyName]));
    const senderMap = Object.fromEntries(senderUsers.map(u => [u.id, u]));

    // Helper: parse verificationTiers JSON string -> string[]
    function parseTiers(raw: string | null | undefined): string[] {
      try {
        const parsed = JSON.parse(raw || '[]');
        return Array.isArray(parsed) ? parsed.filter((t: unknown) => typeof t === 'string') : [];
      } catch { return []; }
    }

    // Build the member list payload (used by the agent thread view to render
    // the member sidebar + by the client view to refresh its member list).
    const memberList = [
      // Owner (the call center) is always a member of the chat conceptually.
      {
        id: 'owner-' + chat.clientId,
        userId: chat.clientId,
        addedAt: chat.createdAt.toISOString(),
        name: clientNameMap[chat.clientId] || chat.client.name || 'Call Center',
        email: '',
        role: 'client',
        avatar: chat.client.avatar,
        isOwner: true,
        verificationTiers: parseTiers((chat.client as any)?.verificationTiers),
        verifiedAt: (chat.client as any)?.verifiedAt ? (chat.client as any).verifiedAt.toISOString() : null,
      },
      ...chat.members.map(m => {
        const tiers = parseTiers((m.user as any)?.verificationTiers);
        return {
          id: m.id,
          userId: m.userId,
          addedAt: m.addedAt.toISOString(),
          name: m.user.name,
          email: m.user.email,
          role: m.user.role,
          avatar: m.user.avatar,
          isOwner: false,
          verificationTiers: tiers,
          verifiedAt: (m.user as any)?.verifiedAt ? (m.user as any).verifiedAt.toISOString() : null,
        };
      }),
    ];

    return NextResponse.json({
      chat: {
        id: chat.id,
        title: chat.title,
        ownerName: clientNameMap[chat.clientId] || chat.client.name || 'Call Center',
        ownerAvatar: chat.client.avatar,
        ownerTiers: parseTiers((chat.client as any)?.verificationTiers),
        ownerVerifiedAt: (chat.client as any)?.verifiedAt ? (chat.client as any).verifiedAt.toISOString() : null,
        createdAt: chat.createdAt.toISOString(),
      },
      members: memberList,
      messages: messages.map(m => {
        const sender = senderMap[m.senderId];
        const senderName = sender?.role === 'client'
          ? (clientNameMap[m.senderId] || sender?.name || 'Call Center')
          : (sender?.name || 'Agent');
        return {
          id: m.id,
          senderId: m.senderId,
          senderRole: m.senderRole,
          senderName,
          senderAvatar: sender?.avatar || null,
          senderTiers: parseTiers((sender as any)?.verificationTiers),
          senderVerifiedAt: (sender as any)?.verifiedAt ? (sender as any).verifiedAt.toISOString() : null,
          content: m.content,
          isRead: m.isRead,
          createdAt: m.createdAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    console.error('GET /api/group-chat/messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

/**
 * POST /api/group-chat/messages
 *  Body: { groupChatId: string, content: string }
 *  - client: groupChatId is REQUIRED (clients have multiple per-job chats now).
 *            Must own the chat.
 *  - agent:  groupChatId is required (must be a chat they're a member of).
 *  Notifies all OTHER members (and the owner if sender is an agent) via in-app + push.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId, role } = auth;

    if (role !== 'client' && role !== 'agent') {
      return NextResponse.json({ error: 'Only clients and agents can send messages' }, { status: 403 });
    }

    const body = await req.json();
    const content = (body?.content || '').toString().trim();
    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

    const groupChatId: string | undefined = body?.groupChatId;
    if (!groupChatId) {
      return NextResponse.json({ error: 'groupChatId required' }, { status: 400 });
    }

    // Authorize
    const chat = await db.groupChat.findUnique({ where: { id: groupChatId } });
    if (!chat) return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    if (role === 'client') {
      if (chat.clientId !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // agent — must be a member
      const member = await db.groupChatMember.findUnique({
        where: { groupChatId_userId: { groupChatId, userId } },
      });
      if (!member) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Persist the message
    const message = await db.groupChatMessage.create({
      data: { groupChatId, senderId: userId, senderRole: role, content },
    });

    await db.groupChat.update({
      where: { id: groupChatId },
      data: { updatedAt: new Date() },
    });

    // Resolve sender display info for the response payload
    const senderUser = await db.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true, avatar: true },
    });
    let senderDisplayName = senderUser?.name || 'Someone';
    let senderAvatar: string | null = senderUser?.avatar || null;
    if (senderUser?.role === 'client') {
      const senderClient = await db.client.findUnique({ where: { userId }, select: { companyName: true } });
      if (senderClient?.companyName) senderDisplayName = senderClient.companyName;
    }

    // Notify everyone else in the chat (owner + members except sender)
    try {
      const chatWithMembers = await db.groupChat.findUnique({
        where: { id: groupChatId },
        include: {
          members: { select: { userId: true } },
          client: { select: { id: true, name: true } },
        },
      });
      if (chatWithMembers) {
        const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;

        const recipientIds = [
          chatWithMembers.clientId,                       // the owner (if sender is agent)
          ...chatWithMembers.members.map(m => m.userId),  // all members
        ].filter(id => id !== userId);                    // exclude sender
        const uniqueRecipientIds = [...new Set(recipientIds)];

        if (uniqueRecipientIds.length > 0) {
          await createNotificationBulk(uniqueRecipientIds, {
            title: 'New message in Team Chat',
            message: senderDisplayName + ': ' + preview,
            type: 'group_chat',
            pushBody: senderDisplayName + ': ' + preview,
            pushUrl: 'https://167.86.124.101:4001/#group-chat',
          });
        }
      }
    } catch (notifErr) {
      console.error('[group-chat/messages POST] notification failed:', notifErr);
    }

    return NextResponse.json({
      message: {
        id: message.id,
        senderId: message.senderId,
        senderRole: message.senderRole,
        senderName: senderDisplayName,
        senderAvatar,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/group-chat/messages error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
