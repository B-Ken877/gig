import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

function normalizePair(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA];
}

// GET /api/messages?userId=... → list conversations for the user
// GET /api/messages?conversationId=... → list messages in a conversation
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

      return NextResponse.json({
        messages: messages.map(m => ({
          id: m.id, conversationId: m.conversationId, senderId: m.senderId,
          senderRole: m.senderRole, content: m.content, isRead: m.isRead,
          createdAt: m.createdAt.toISOString(),
        })),
      });
    }

    // List all conversations for the user
    const targetUserId = userIdParam || userId;
    const conversations = await db.conversation.findMany({
      where: { OR: [{ user1Id: targetUserId }, { user2Id: targetUserId }] },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Fetch the other user for each conversation
    const otherUserIds = conversations.map(c => c.user1Id === targetUserId ? c.user2Id : c.user1Id);
    const otherUsers = await db.user.findMany({
      where: { id: { in: otherUserIds } },
      select: { id: true, name: true, email: true, role: true, avatar: true },
    });
    const userMap = new Map(otherUsers.map(u => [u.id, u]));

    const result = conversations.map(c => {
      const otherId = c.user1Id === targetUserId ? c.user2Id : c.user1Id;
      const other = userMap.get(otherId);
      const unreadCount = c.user1Id === targetUserId ? c.unreadUser1 : c.unreadUser2;
      return {
        id: c.id,
        otherUser: other ? { id: other.id, name: other.name, email: other.email, role: other.role, avatar: other.avatar } : null,
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt?.toISOString() || null,
        unreadCount,
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST /api/messages — send a message to another user
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId, role } = auth;

    const body = await req.json();
    const { recipientId, content } = body;
    if (!recipientId || !content) {
      return NextResponse.json({ error: 'recipientId and content are required' }, { status: 400 });
    }

    const [user1Id, user2Id] = normalizePair(userId, recipientId);

    // Find or create the conversation
    let conversation = await db.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (!conversation) {
      conversation = await db.conversation.create({ data: { user1Id, user2Id } });
    }

    // Create the message
    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        senderRole: role,
        content,
        isRead: false,
      },
    });

    // Update conversation stats
    const isSenderUser1 = conversation.user1Id === userId;
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: content,
        lastMessageAt: new Date(),
        unreadUser1: isSenderUser1 ? conversation.unreadUser1 : conversation.unreadUser1 + 1,
        unreadUser2: isSenderUser1 ? conversation.unreadUser2 + 1 : conversation.unreadUser2,
      },
    });

    // Notify the recipient
    try {
      await createNotification(recipientId, {
        title: 'New Message',
        message: 'You have a new message',
        type: 'message',
      });
    } catch (e) {
      console.error('[messages POST] notification failed:', e);
    }

    return NextResponse.json({
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderRole: message.senderRole,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// PATCH /api/messages — mark a conversation as read
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId } = auth;

    const body = await req.json();
    const { conversationId } = body;
    if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });

    const conv = await db.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (conv.user1Id !== userId && conv.user2Id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (conv.user1Id === userId) {
      await db.conversation.update({ where: { id: conversationId }, data: { unreadUser1: 0 } });
    } else {
      await db.conversation.update({ where: { id: conversationId }, data: { unreadUser2: 0 } });
    }

    await db.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/messages error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
