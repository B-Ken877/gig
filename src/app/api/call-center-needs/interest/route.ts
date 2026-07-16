import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

function norm(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'agent') return NextResponse.json({ error: 'Agent only' }, { status: 403 });

    const body = await req.json();
    const { needId } = body;
    if (!needId) return NextResponse.json({ error: 'needId required' }, { status: 400 });

    const need = await db.callCenterNeed.findUnique({
      where: { id: needId },
      include: { client: { select: { userId: true, companyName: true } } },
    });
    if (!need || !need.client) return NextResponse.json({ error: 'Need not found' }, { status: 404 });

    const clientUserId = need.client.userId;
    const agentUserId = auth.userId;

    // Check duplicate
    const existing = await db.notification.findFirst({
      where: { userId: clientUserId, type: 'interest', message: { contains: agentUserId } },
    });
    if (existing) {
      let parsed: any = {};
      try { parsed = JSON.parse(existing.message); } catch {}
      if (parsed.agentId === agentUserId && parsed.needId === needId) {
        return NextResponse.json({ error: 'You already applied for this need' }, { status: 409 });
      }
    }

    // Get agent info
    const agent = await db.user.findUnique({ where: { id: agentUserId }, select: { name: true, email: true, phone: true } });
    const agentProfile = await db.agent.findUnique({ where: { userId: agentUserId } });
    const agentName = agent?.name || 'An agent';

    // Create in-app notification for client (with push)
    const notification = await db.notification.create({
      data: {
        userId: clientUserId,
        title: 'New Agent Interested!',
        message: JSON.stringify({
          agentId: agentUserId,
          agentName,
          agentEmail: agent?.email || '',
          agentPhone: agent?.phone || '',
          agentCountry: agentProfile?.country || '',
          agentLanguages: agentProfile?.languages || '[]',
          agentExperience: agentProfile?.experience || 0,
          agentSkills: agentProfile?.skills || '[]',
          agentStatus: agentProfile?.status || 'Available',
          needId: need.id,
          needTitle: need.title,
          needDescription: need.description || '',
          companyName: need.client.companyName,
          clientId: need.clientId,
        }),
        type: 'interest',
        channel: 'in-app',
      },
    });

    // Send push notification to client about new application
    await createNotification({
      userId: clientUserId,
      title: 'New Application Received',
      message: agentName + ' applied for "' + (need.title || 'your staffing need') + '"',
      type: 'application',
      pushBody: agentName + ' applied for "' + need.title + '"',
      pushUrl: 'https://167.86.124.101:4001/#client-applications',
    });

    // Create or find conversation
    const [u1, u2] = norm(agentUserId, clientUserId);
    let conversation = await db.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
    });

    const introMsg = 'Hi! I\'m interested in your staffing need: "' + need.title + '"';

    if (!conversation) {
      conversation = await db.conversation.create({
        data: { user1Id: u1, user2Id: u2, lastMessage: introMsg },
      });
    } else {
      await db.conversation.update({ where: { id: conversation.id }, data: { lastMessage: introMsg } });
    }

    const fullMsg = 'Hi! I saw your staffing need for "' + need.title + '" and I\'m very interested. I believe my skills and experience make me a great fit. Let\'s discuss further!';
    await db.message.create({
      data: { conversationId: conversation.id, senderId: agentUserId, content: fullMsg },
    });

    // Update conversation unread count for client
    const clientField = u1 === clientUserId ? 'unreadUser1' : 'unreadUser2';
    await db.conversation.update({
      where: { id: conversation.id },
      data: { [clientField]: { increment: 1 } },
    });

    return NextResponse.json({ success: true, notificationId: notification.id, conversationId: conversation.id });
  } catch (error) {
    console.error('POST /api/call-center-needs/interest error:', error);
    return NextResponse.json({ error: 'Failed to submit interest' }, { status: 500 });
  }
}

// GET: Returns applications.
// If role=client: returns applications received (notifications for this client with type=interest)
// If role=agent: returns applications sent by this agent
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    if (auth.role === 'client') {
      const notifications = await db.notification.findMany({
        where: { userId: auth.userId, type: 'interest' },
        orderBy: { createdAt: 'desc' },
      });

      const agentIds = [...new Set(notifications.map(n => {
        try { return JSON.parse(n.message).agentId; } catch { return null; }
      }).filter(Boolean))] as string[];

      const agentUsers = agentIds.length > 0 ? await db.user.findMany({
        where: { id: { in: agentIds } },
        select: { id: true, name: true, email: true, phone: true },
      }) : [];

      const agentProfiles = agentIds.length > 0 ? await db.agent.findMany({
        where: { userId: { in: agentIds } },
      }) : [];

      const userMap = Object.fromEntries(agentUsers.map(u => [u.id, u]));
      const profileMap = Object.fromEntries(agentProfiles.map(a => [a.userId, a]));

      const applications = notifications.map(n => {
        let parsed: any = {};
        try { parsed = JSON.parse(n.message); } catch {}
        const au = userMap[parsed.agentId];
        const ap = profileMap[parsed.agentId];
        return {
          notificationId: n.id,
          agentId: parsed.agentId || '',
          agentName: parsed.agentName || au?.name || 'Unknown',
          agentEmail: parsed.agentEmail || au?.email || '',
          agentPhone: parsed.agentPhone || au?.phone || '',
          agentCountry: parsed.agentCountry || ap?.country || '',
          agentLanguages: Array.isArray(parsed.agentLanguages) && parsed.agentLanguages.length > 0 ? parsed.agentLanguages : (Array.isArray(ap?.languages) ? ap.languages : []),
          agentExperience: parsed.agentExperience || ap?.experience || 0,
          agentSkills: Array.isArray(parsed.agentSkills) && parsed.agentSkills.length > 0 ? parsed.agentSkills : (Array.isArray(ap?.skills) ? ap.skills : []),
          agentStatus: parsed.agentStatus || ap?.status || 'Available',
          needId: parsed.needId || '',
          needTitle: parsed.needTitle || '',
          needDescription: parsed.needDescription || '',
          companyName: parsed.companyName || '',
          clientId: parsed.clientId || '',
          appliedAt: n.createdAt.toISOString(),
          isRead: n.isRead,
        };
      });

      return NextResponse.json({ applications });
    }

    if (auth.role === 'agent') {
      const notifications = await db.notification.findMany({
        where: { type: 'interest', message: { contains: auth.userId } },
        orderBy: { createdAt: 'desc' },
      });

      const applications = [];
      for (const n of notifications) {
        let parsed: any = {};
        try { parsed = JSON.parse(n.message); } catch {}
        if (parsed.agentId === auth.userId) {
          applications.push({
            notificationId: n.id,
            ...parsed,
            appliedAt: n.createdAt.toISOString(),
          });
        }
      }

      return NextResponse.json({ applications });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 403 });
  } catch (error) {
    console.error('GET /api/call-center-needs/interest error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

