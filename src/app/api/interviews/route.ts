import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuth } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

// POST /api/interviews
// Admin schedules an interview for a job application.
// Body: { applicationId, scheduledAt (ISO string), timezone?, location?, notes? }
//
// Side effects:
//   1. Creates an Interview row.
//   2. Updates the JobApplication.status → 'interview_scheduled'.
//   3. Finds (or creates) the conversation between the admin and the agent's user account.
//   4. Posts an automated message from the admin into that conversation with the interview details.
//   5. Creates an in-app notification + push for the agent (type = 'interview_scheduled')
//      whose message payload carries the conversationId so the agent can click → open that chat.
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json();
    const { applicationId, scheduledAt, timezone, location, notes } = body as {
      applicationId?: string;
      scheduledAt?: string;
      timezone?: string;
      location?: string;
      notes?: string;
    };

    if (!applicationId || !scheduledAt) {
      return NextResponse.json({ error: 'applicationId and scheduledAt are required' }, { status: 400 });
    }

    const when = new Date(scheduledAt);
    if (isNaN(when.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 });
    }
    if (when.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: 'Interview time cannot be in the past' }, { status: 400 });
    }

    // Load the application with all the relations we need
    const app = await db.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        jobPost: true,
        agent: { include: { user: true } },
      },
    });
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Find the admin user (the first admin in the system, used as the message sender)
    const adminUser = await db.user.findFirst({ where: { role: 'admin', isActive: true } });
    if (!adminUser) {
      return NextResponse.json({ error: 'No active admin user found to send the message from' }, { status: 500 });
    }

    // ─── 1. Create the Interview row ─────────────────────────────────────────
    const interview = await db.interview.create({
      data: {
        applicationId: app.id,
        agentId: app.agentId,
        jobPostId: app.jobPostId,
        adminId: auth.userId,
        scheduledAt: when,
        timezone: timezone || null,
        location: location || null,
        notes: notes || null,
        status: 'scheduled',
      },
    });

    // ─── 2. Update the application status ────────────────────────────────────
    await db.jobApplication.update({
      where: { id: app.id },
      data: { status: 'interview_scheduled' },
    });

    // ─── 3. Find or create the conversation between admin and agent's user ─
    const [user1Id, user2Id] = auth.userId < app.agent.userId
      ? [auth.userId, app.agent.userId]
      : [app.agent.userId, auth.userId];

    let conversation = await db.conversation.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });
    if (!conversation) {
      conversation = await db.conversation.create({ data: { user1Id, user2Id } });
    }

    // Stash the conversationId on the interview row (for admin audit trail)
    await db.interview.update({
      where: { id: interview.id },
      data: { conversationId: conversation.id },
    });

    // ─── 4. Post the automated message ──────────────────────────────────────
    const jobTitle = app.jobPost?.jobTitle || 'the position you applied for';
    const formattedTime = when.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    let content = `Congratulations! After reviewing your application for "${jobTitle}", we would like to schedule an interview with you.\n\n`;
    content += `📅 Interview Date & Time: ${formattedTime}${timezone ? ` (${timezone})` : ''}\n`;
    if (location) content += `📍 Location: ${location}\n`;
    if (notes) content += `📝 Notes: ${notes}\n`;
    content += `\nPlease reply to this message to confirm your attendance, or let us know if you need to reschedule. We look forward to speaking with you!\n\n— Gig Solutions Team`;

    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        senderId: adminUser.id,
        senderRole: 'admin',
        content,
        isRead: false,
      },
    });

    // Update the conversation's last message + bump the agent's unread count
    const isAgentUser1 = conversation.user1Id === app.agent.userId;
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: content,
        lastMessageAt: new Date(),
        // The admin is the sender, so increment the OTHER party's unread count
        unreadUser1: isAgentUser1 ? conversation.unreadUser1 + 1 : conversation.unreadUser1,
        unreadUser2: isAgentUser1 ? conversation.unreadUser2 : conversation.unreadUser2 + 1,
      },
    });

    // ─── 5. Notify the agent (in-app + push) ────────────────────────────────
    // Encode the conversationId in the message field so the client can route
    // the click directly to that chat. Format: "conversationId|<human text>"
    try {
      await createNotification({
        userId: app.agent.userId,
        title: 'Interview Scheduled — Congratulations!',
        message: conversation.id + '|Your interview for "' + jobTitle + '" is scheduled for ' + formattedTime + '. Click to view the details in your messages.',
        type: 'interview_scheduled',
        pushBody: 'Your interview for "' + jobTitle + '" is scheduled for ' + formattedTime + '. Tap to view the details.',
        pushUrl: '/#messages',
      });
    } catch (e) {
      console.error('[interviews POST] notification failed:', e);
    }

    return NextResponse.json({
      interview: {
        id: interview.id,
        scheduledAt: interview.scheduledAt.toISOString(),
        status: interview.status,
        conversationId: conversation.id,
        messageId: message.id,
      },
      application: { id: app.id, status: 'interview_scheduled' },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/interviews error:', error);
    return NextResponse.json({ error: 'Failed to schedule interview' }, { status: 500 });
  }
}

// GET /api/interviews?applicationId=...   → list interviews for an application
// GET /api/interviews?agentId=...         → list upcoming interviews for an agent
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuth(req);
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get('applicationId');
    const agentId = searchParams.get('agentId');

    const where: Record<string, unknown> = {};
    if (applicationId) where.applicationId = applicationId;
    if (agentId) {
      // Agents can only see their own interviews
      if (auth.role !== 'admin') {
        // Need to verify this agentId belongs to the user
        const agent = await db.agent.findUnique({ where: { id: agentId }, select: { userId: true } });
        if (!agent || agent.userId !== auth.userId) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }
      where.agentId = agentId;
    }

    if (!applicationId && !agentId && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const interviews = await db.interview.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        application: {
          include: {
            jobPost: { select: { id: true, jobTitle: true, location: true } },
            agent: {
              select: {
                id: true,
                country: true,
                experience: true,
                userId: true,
                user: { select: { id: true, name: true, email: true, avatar: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      interviews: interviews.map(i => ({
        id: i.id,
        applicationId: i.applicationId,
        agentId: i.agentId,
        jobPostId: i.jobPostId,
        scheduledAt: i.scheduledAt.toISOString(),
        timezone: i.timezone,
        location: i.location,
        notes: i.notes,
        status: i.status,
        conversationId: i.conversationId,
        createdAt: i.createdAt.toISOString(),
        // Joined relations for display
        agent: i.application?.agent ? {
          id: i.application.agent.id,
          name: i.application.agent.user?.name,
          email: i.application.agent.user?.email,
          avatar: i.application.agent.user?.avatar,
          userId: i.application.agent.userId,
          country: i.application.agent.country,
          experience: i.application.agent.experience,
        } : null,
        jobPost: i.application?.jobPost ? {
          id: i.application.jobPost.id,
          jobTitle: i.application.jobPost.jobTitle,
          location: i.application.jobPost.location,
        } : null,
        applicationStatus: i.application?.status || null,
      })),
    });
  } catch (error) {
    console.error('GET /api/interviews error:', error);
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
  }
}
