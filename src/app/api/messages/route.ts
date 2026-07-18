import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

function normalizePair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId } = auth;

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const userIdParam = searchParams.get('userId');

    if (conversationId) {
      const conv = await db.conversation.findUnique({ where: { id: conversationId } });
      if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      if (conv.user1Id !== userId && conv.user2Id !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      const messages = await db.message.findMany({
        where: { conversationId }, orderBy: { createdAt: 'asc' },
      });

      const unread = messages.filter(m => !m.isRead && m.senderId !== userId);
      if (unread.length > 0) {
        await db.message.updateMany({ where: { id: { in: unread.map(m => m.id) } }, data: { isRead: true } });
        const field = conv.user1Id === userId ? 'unreadUser1' : 'unreadUser2';
        await db.conversation.update({ where: { id: conversationId }, data: { [field]: 0 } });
      }

      return NextResponse.json({ messages: messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString(), updatedAt: m.updatedAt.toISOString() })) });
    }

    if (userIdParam) {
      const conversations = await db.conversation.findMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
        include: {
          user1: { select: { id: true, name: true, role: true, avatar: true } },
          user2: { select: { id: true, name: true, role: true, avatar: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { lastMessageAt: 'desc' },
      });

      // Get company names for all client-role users in one query
      const clientUserIds = [...new Set(conversations.flatMap(c => [c.user1, c.user2].filter(u => u?.role === 'client').map(u => u.id)))];
      const clients = clientUserIds.length > 0 ? await db.client.findMany({ where: { userId: { in: clientUserIds } }, select: { userId: true, companyName: true } }) : [];
      const companyNameMap = Object.fromEntries(clients.map(cl => [cl.userId, cl.companyName]));

      const result = conversations.map(c => {
        const isUser1 = c.user1Id === userId;
        const otherUser = isUser1 ? c.user2 : c.user1;
        const displayName = otherUser?.role === 'client' && companyNameMap[otherUser.id] ? companyNameMap[otherUser.id] : (otherUser?.name || 'Unknown');
        return {
          id: c.id, user1Id: c.user1Id, user2Id: c.user2Id,
          lastMessage: c.lastMessage, lastMessageAt: c.lastMessageAt?.toISOString() || null,
          unreadCount: isUser1 ? c.unreadUser1 : c.unreadUser2,
          otherUser: otherUser ? { name: displayName, role: otherUser.role, avatar: otherUser.avatar } : { name: 'Unknown', role: 'visitor', avatar: null },
          latestMessage: c.messages[0] ? { id: c.messages[0].id, content: c.messages[0].content, senderId: c.messages[0].senderId, createdAt: c.messages[0].createdAt.toISOString() } : null,
        };
      });
      return NextResponse.json({ conversations: result });
    }

    return NextResponse.json({ error: 'Provide conversationId or userId' }, { status: 400 });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId, role } = auth;

    const body = await req.json();
    const { conversationId, recipientUserId, content } = body;
    if (!content || !content.trim()) return NextResponse.json({ error: 'Message content is required' }, { status: 400 });

    let convId = conversationId;
    if (!convId) {
      if (!recipientUserId) return NextResponse.json({ error: 'recipientUserId required' }, { status: 400 });
      const [u1, u2] = normalizePair(userId, recipientUserId);
      const existing = await db.conversation.findUnique({ where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } } });
      if (existing) { convId = existing.id; }
      else {
        const conv = await db.conversation.create({ data: { user1Id: u1, user2Id: u2 } });
        convId = conv.id;
      }
    }

    const message = await db.message.create({
      data: { conversationId: convId, senderId: userId, senderRole: role, content: content.trim() },
    });

    await db.conversation.update({
      where: { id: convId },
      data: { lastMessage: content.trim(), lastMessageAt: new Date() },
    });

    // Notify recipient (in-app + push)
    try {
      const conv = await db.conversation.findUnique({ where: { id: convId } });
      if (conv) {
        const recipientId = userId === conv.user1Id ? conv.user2Id : conv.user1Id;
        // Increment unread count for recipient
        const field = conv.user1Id === recipientId ? 'unreadUser1' : 'unreadUser2';
        await db.conversation.update({
          where: { id: convId },
          data: { [field]: { increment: 1 } },
        });

        const sender = await db.user.findUnique({ where: { id: userId }, select: { name: true, role: true } });
        let senderName = sender?.name || 'Someone';
        if (sender?.role === 'client') {
          const senderClient = await db.client.findUnique({ where: { userId }, select: { companyName: true } });
          if (senderClient?.companyName) senderName = senderClient.companyName;
        }
        const preview = content.trim().substring(0, 100) + (content.trim().length > 100 ? '...' : '');

        await createNotification({
          userId: recipientId,
          title: 'New Message from ' + senderName,
          message: preview,
          type: 'message',
          pushBody: senderName + ': ' + preview,
          pushUrl: 'https://167.86.124.101:4001/#messages',
        });
      }
    } catch (notifErr) {
      console.error('[messages POST] notification failed:', notifErr);
    }

    return NextResponse.json({ message: { ...message, createdAt: message.createdAt.toISOString() }, conversationId: convId }, { status: 201 });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

