import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';

/**
 * GET /api/group-chat
 *  - client: returns a LIST of the client's per-job group chats (one per
 *             CallCenterNeed they've hired for), each with members and the
 *             latest message preview. Does NOT auto-create chats — chats are
 *             created lazily on hire or on explicit POST.
 *             Legacy chats with needId=NULL are included as "General Chat".
 *  - agent:   returns the list of group chats the agent is a member of
 *             (with owner company name + need title + member count + latest message).
 *  - other:   403.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { userId, role } = auth;

    if (role === 'client') {
      const chats = await db.groupChat.findMany({
        where: { clientId: userId },
        include: {
          need: { select: { id: true, title: true, isActive: true } },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true, avatar: true, verificationTiers: true, verifiedAt: true },
              },
            },
            orderBy: { addedAt: 'desc' },
          },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { members: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Resolve client company name (single row, cheap)
      const clientRow = await db.client.findUnique({
        where: { userId },
        select: { companyName: true },
      });
      const ownerName = clientRow?.companyName || 'Call Center';

      const result = chats.map(c => {
        const latest = c.messages[0];
        const tiers = (u: { verificationTiers?: string | null }): string[] => {
          try {
            const parsed = JSON.parse(u?.verificationTiers || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch { return []; }
        };
        return {
          id: c.id,
          title: c.title,
          needId: c.needId,
          needTitle: c.need?.title || null,
          needActive: c.need?.isActive ?? null,
          isLegacy: c.needId === null,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          ownerName,
          memberCount: c._count.members,
          members: c.members.map(m => ({
            id: m.id,
            userId: m.userId,
            addedAt: m.addedAt.toISOString(),
            name: m.user.name,
            email: m.user.email,
            role: m.user.role,
            avatar: m.user.avatar,
            verificationTiers: tiers(m.user as any),
            verifiedAt: (m.user as any)?.verifiedAt ? (m.user as any).verifiedAt.toISOString() : null,
          })),
          latestMessage: latest
            ? {
                content: latest.content,
                senderId: latest.senderId,
                senderRole: latest.senderRole,
                createdAt: latest.createdAt.toISOString(),
              }
            : null,
        };
      });

      return NextResponse.json({ groupChats: result });
    }

    if (role === 'agent') {
      // List all group chats this agent is a member of.
      const memberships = await db.groupChatMember.findMany({
        where: { userId },
        include: {
          groupChat: {
            include: {
              client: { select: { id: true, name: true, avatar: true, verificationTiers: true, verifiedAt: true } },
              need: { select: { id: true, title: true, isActive: true } },
              messages: { orderBy: { createdAt: 'desc' }, take: 1 },
              _count: { select: { members: true } },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      });

      // Resolve client company names in one shot
      const clientUserIds = [...new Set(memberships.map(m => m.groupChat.clientId))];
      const clients = clientUserIds.length > 0
        ? await db.client.findMany({ where: { userId: { in: clientUserIds } }, select: { userId: true, companyName: true } })
        : [];
      const companyNameMap = Object.fromEntries(clients.map(c => [c.userId, c.companyName]));

      // Helper: parse verificationTiers JSON string -> string[]
      function parseTiers(raw: string | null | undefined): string[] {
        try {
          const parsed = JSON.parse(raw || '[]');
          return Array.isArray(parsed) ? parsed.filter((t: unknown) => typeof t === 'string') : [];
        } catch { return []; }
      }

      return NextResponse.json({
        groupChats: memberships.map(m => ({
          id: m.groupChat.id,
          title: m.groupChat.title,
          needId: m.groupChat.needId,
          needTitle: m.groupChat.need?.title || null,
          isLegacy: m.groupChat.needId === null,
          ownerName: companyNameMap[m.groupChat.clientId] || m.groupChat.client.name || 'Call Center',
          ownerAvatar: m.groupChat.client.avatar,
          ownerTiers: parseTiers((m.groupChat.client as any)?.verificationTiers),
          ownerVerifiedAt: (m.groupChat.client as any)?.verifiedAt ? (m.groupChat.client as any).verifiedAt.toISOString() : null,
          memberCount: m.groupChat._count.members,
          joinedAt: m.addedAt.toISOString(),
          latestMessage: m.groupChat.messages[0]
            ? {
                content: m.groupChat.messages[0].content,
                senderId: m.groupChat.messages[0].senderId,
                createdAt: m.groupChat.messages[0].createdAt.toISOString(),
              }
            : null,
        })),
      });
    }

    return NextResponse.json({ error: 'Only clients and agents can access group chat' }, { status: 403 });
  } catch (error) {
    console.error('GET /api/group-chat error:', error);
    return NextResponse.json({ error: 'Failed to fetch group chat' }, { status: 500 });
  }
}

/**
 * POST /api/group-chat
 *  - client: explicitly create a per-job group chat for a specific need
 *    (idempotent — returns existing if one already exists for that client+need).
 *    Body: { needId: string, title?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'client') return NextResponse.json({ error: 'Client only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const needId = (body?.needId || '').toString();
    if (!needId) return NextResponse.json({ error: 'needId required (each chat is scoped to a job)' }, { status: 400 });

    // Verify the need belongs to this client
    const clientRow = await db.client.findUnique({ where: { userId: auth.userId }, select: { id: true } });
    if (!clientRow) return NextResponse.json({ error: 'Client profile not found' }, { status: 404 });
    const need = await db.callCenterNeed.findUnique({ where: { id: needId }, select: { id: true, title: true, clientId: true } });
    if (!need) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (need.clientId !== clientRow.id) return NextResponse.json({ error: 'This job does not belong to your account' }, { status: 403 });

    const title = (body?.title || ('Team Chat: ' + need.title)).toString().slice(0, 120);
    const chat = await ensureChatForNeed(auth.userId, needId, title);

    return NextResponse.json({
      groupChat: {
        id: chat.id,
        title: chat.title,
        needId: chat.needId,
        createdAt: chat.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /api/group-chat error:', error);
    return NextResponse.json({ error: 'Failed to create group chat' }, { status: 500 });
  }
}

/**
 * Ensure a GroupChat row exists for a given (client, need) pair.
 * The @@unique([clientId, needId]) composite constraint guarantees uniqueness.
 */
export async function ensureChatForNeed(clientUserId: string, needId: string, title: string = 'Team Chat') {
  const existing = await db.groupChat.findUnique({
    where: { clientId_needId: { clientId: clientUserId, needId } },
  });
  if (existing) return existing;
  return db.groupChat.create({
    data: { clientId: clientUserId, needId, title },
  });
}
