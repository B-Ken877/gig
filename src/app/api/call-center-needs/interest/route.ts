import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

function norm(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

// Safe JSON parse — Agent.languages/skills/education/previousEmployers/computerSpecs
// are stored as JSON-encoded strings; some legacy rows may contain invalid JSON.
function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return (typeof fallback === 'string' ? raw as unknown as T : fallback);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'agent') return NextResponse.json({ error: 'Agent only' }, { status: 403 });

    // ─── Payment gate ───────────────────────────────────────────────────
    // Agents must have an active subscription (paid + paidUntil > now)
    // before they can apply for a job. Registration is free; payment is
    // only required at this moment. If unpaid/expired, return 402 so the
    // client knows to redirect to the payment chat.
    const agentUser = await db.user.findUnique({
      where: { id: auth.userId },
      select: { paid: true, paidUntil: true },
    });
    const now = new Date();
    const isPaid = !!(agentUser?.paid && agentUser.paidUntil && agentUser.paidUntil > now);
    if (!isPaid) {
      return NextResponse.json(
        { error: 'Payment required', code: 'PAYMENT_REQUIRED', tier: 'agent_quarterly', amount: 1000, currency: 'HTG' },
        { status: 402 },
      );
    }

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

    // Get agent info — select avatar + verificationTiers + gigScore in
    // addition to the basic fields. Phone is intentionally NOT selected
    // because we never expose it to other users.
    const agent = await db.user.findUnique({
      where: { id: agentUserId },
      select: { name: true, email: true, avatar: true, verificationTiers: true, gigScore: true },
    });
    const agentProfile = await db.agent.findUnique({ where: { userId: agentUserId } });
    const agentName = agent?.name || 'An agent';
    const agentAvatar = agent?.avatar || null;
    let agentTiersArr: string[] = [];
    try {
      const parsed = JSON.parse((agent as any)?.verificationTiers || '[]');
      if (Array.isArray(parsed)) agentTiersArr = parsed.filter((t: unknown) => typeof t === 'string');
    } catch { /* leave empty */ }
    const agentGigScore = (agent as any)?.gigScore || 0;

    // Snapshot the FULL agent profile (everything EXCEPT phone) so the
    // client's "Applications" tab can render the complete profile without
    // an extra round-trip. Phone is intentionally omitted — never expose.
    const agentSnapshot = {
      agentId: agentUserId,
      agentName,
      agentEmail: agent?.email || '',
      agentAvatar: agentAvatar || null,
      agentTiers: agentTiersArr,
      agentGigScore,
      agentCountry: agentProfile?.country || '',
      agentAddress: agentProfile?.address || '',
      agentDateOfBirth: agentProfile?.dateOfBirth ? agentProfile.dateOfBirth.toISOString() : null,
      agentLanguages: safeJson<string[]>(agentProfile?.languages, []),
      agentExperience: agentProfile?.experience || 0,
      agentSkills: safeJson<string[]>(agentProfile?.skills, []),
      agentPreviousEmployers: safeJson<string[]>(agentProfile?.previousEmployers, []),
      agentEducation: safeJson<string[]>(agentProfile?.education, []),
      agentComputerSpecs: safeJson<string>(agentProfile?.computerSpecs, ''),
      agentRam: agentProfile?.ram || '',
      agentProcessor: agentProfile?.processor || '',
      agentInternetSpeed: agentProfile?.internetSpeed || '',
      agentBackupInternet: !!agentProfile?.backupInternet,
      agentHeadsetAvailable: !!agentProfile?.headsetAvailable,
      agentUpsAvailable: !!agentProfile?.upsAvailable,
      agentPreferredShift: agentProfile?.preferredShift || '',
      agentSalaryExpectation: agentProfile?.salaryExpectation ?? null,
      agentNiu: agentProfile?.niu || '',
      agentStatus: agentProfile?.status || 'Available',
      needId: need.id,
      needTitle: need.title,
      needDescription: need.description || '',
      companyName: need.client.companyName,
      clientId: need.clientId,
    };

    // Create in-app notification for client (with push)
    // NOTE: We deliberately do NOT include the agent's phone number here —
    // phone numbers are private and should never be exposed to other users.
    const notification = await db.notification.create({
      data: {
        userId: clientUserId,
        title: 'New Agent Interested!',
        message: JSON.stringify(agentSnapshot),
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
//
// IMPORTANT: every agent profile field EXCEPT phone is returned so the
// client's "Applications" tab can render the full agent profile.
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
        // NOTE: phone is intentionally NOT selected here.
        select: {
          id: true, name: true, email: true, avatar: true,
          verificationTiers: true, gigScore: true,
        },
      }) : [];

      const agentProfiles = agentIds.length > 0 ? await db.agent.findMany({
        where: { userId: { in: agentIds } },
        include: { documents: { select: { id: true, type: true, fileName: true, fileUrl: true } } },
      }) : [];

      const userMap = Object.fromEntries(agentUsers.map(u => [u.id, u]));
      const profileMap = Object.fromEntries(agentProfiles.map(a => [a.userId, a]));

      const applications = notifications.map(n => {
        let parsed: any = {};
        try { parsed = JSON.parse(n.message); } catch {}
        const au = userMap[parsed.agentId];
        const ap = profileMap[parsed.agentId];
        // Parse verification tiers from the user row (defensive — could be string or array)
        let tiers: string[] = [];
        const rawTiers = (au as any)?.verificationTiers;
        if (Array.isArray(rawTiers)) tiers = rawTiers;
        else if (typeof rawTiers === 'string') {
          try { const v = JSON.parse(rawTiers); if (Array.isArray(v)) tiers = v; } catch { /* ignore */ }
        }
        // Prefer the snapshot stored in the notification, fall back to the live user row.
        const liveTiers = Array.isArray(parsed.agentTiers) ? parsed.agentTiers : tiers;
        // Pull the full agent profile — prefer the live row (most up-to-date),
        // fall back to the snapshot. Phone is never returned.
        const liveLanguages = safeJson<string[]>(ap?.languages, Array.isArray(parsed.agentLanguages) ? parsed.agentLanguages : []);
        const liveSkills = safeJson<string[]>(ap?.skills, Array.isArray(parsed.agentSkills) ? parsed.agentSkills : []);
        const livePrevEmp = safeJson<string[]>(ap?.previousEmployers, Array.isArray(parsed.agentPreviousEmployers) ? parsed.agentPreviousEmployers : []);
        const liveEducation = safeJson<string[]>(ap?.education, Array.isArray(parsed.agentEducation) ? parsed.agentEducation : []);
        const liveComputerSpecs = safeJson<string>(ap?.computerSpecs, parsed.agentComputerSpecs || '');
        return {
          notificationId: n.id,
          agentId: parsed.agentId || '',
          agentName: parsed.agentName || au?.name || 'Unknown',
          agentEmail: parsed.agentEmail || au?.email || '',
          agentAvatar: parsed.agentAvatar || au?.avatar || null,
          agentTiers: liveTiers,
          agentGigScore: parsed.agentGigScore || (au as any)?.gigScore || 0,
          agentCountry: parsed.agentCountry || ap?.country || '',
          agentAddress: ap?.address || parsed.agentAddress || '',
          agentDateOfBirth: ap?.dateOfBirth ? ap.dateOfBirth.toISOString() : (parsed.agentDateOfBirth || null),
          agentLanguages: liveLanguages,
          agentExperience: parsed.agentExperience || ap?.experience || 0,
          agentSkills: liveSkills,
          agentPreviousEmployers: livePrevEmp,
          agentEducation: liveEducation,
          agentComputerSpecs: liveComputerSpecs,
          agentRam: ap?.ram || parsed.agentRam || '',
          agentProcessor: ap?.processor || parsed.agentProcessor || '',
          agentInternetSpeed: ap?.internetSpeed || parsed.agentInternetSpeed || '',
          agentBackupInternet: ap ? !!ap.backupInternet : !!parsed.agentBackupInternet,
          agentHeadsetAvailable: ap ? !!ap.headsetAvailable : !!parsed.agentHeadsetAvailable,
          agentUpsAvailable: ap ? !!ap.upsAvailable : !!parsed.agentUpsAvailable,
          agentPreferredShift: ap?.preferredShift || parsed.agentPreferredShift || '',
          agentSalaryExpectation: ap?.salaryExpectation ?? (parsed.agentSalaryExpectation ?? null),
          agentNiu: ap?.niu || parsed.agentNiu || '',
          agentStatus: parsed.agentStatus || ap?.status || 'Available',
          agentDocuments: ap?.documents || [],
          needId: parsed.needId || '',
          needTitle: parsed.needTitle || '',
          needDescription: parsed.needDescription || '',
          companyName: parsed.companyName || '',
          clientId: parsed.clientId || '',
          appliedAt: n.createdAt.toISOString(),
          isRead: n.isRead,
          rejectedAt: parsed.rejectedAt || null,
        };
      });

      return NextResponse.json({ applications });
    }

    if (auth.role === 'agent') {
      const notifications = await db.notification.findMany({
        where: { type: 'interest', message: { contains: auth.userId } },
        orderBy: { createdAt: 'desc' },
      });

      // Look up the client (call center) user rows in one shot so we can
      // attach their verification badges to each application. We need the
      // Client row to resolve userId from clientId (stored in snapshot).
      const clientIds = [];
      for (const n of notifications) {
        let parsed: any = {};
        try { parsed = JSON.parse(n.message); } catch {}
        if (parsed.clientId && parsed.agentId === auth.userId) clientIds.push(parsed.clientId);
      }
      const clientRows = clientIds.length > 0
        ? await db.client.findMany({
            where: { id: { in: clientIds } },
            select: { id: true, userId: true },
          })
        : [];
      const clientUserIdMap = Object.fromEntries(clientRows.map(c => [c.id, c.userId]));
      const clientUserIds = Array.from(new Set(Object.values(clientUserIdMap)));
      const clientUserRows = clientUserIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: clientUserIds } },
            select: { id: true, verificationTiers: true, verifiedAt: true },
          })
        : [];
      const clientVerifyMap = Object.fromEntries(clientUserRows.map(u => [u.id, u]));

      const applications = [];
      for (const n of notifications) {
        let parsed: any = {};
        try { parsed = JSON.parse(n.message); } catch {}
        if (parsed.agentId === auth.userId) {
          // Attach the call center's verificationTiers (for the badge)
          const clientUserId = clientUserIdMap[parsed.clientId];
          const clientUser = clientUserId ? clientVerifyMap[clientUserId] : null;
          let clientTiers: string[] = [];
          try {
            const t = JSON.parse((clientUser as any)?.verificationTiers || '[]');
            if (Array.isArray(t)) clientTiers = t.filter((x: unknown) => typeof x === 'string');
          } catch { /* ignore */ }
          applications.push({
            notificationId: n.id,
            ...parsed,
            clientUserId: clientUserId || null,
            clientTiers,
            clientVerifiedAt: (clientUser as any)?.verifiedAt ? (clientUser as any).verifiedAt.toISOString() : null,
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
