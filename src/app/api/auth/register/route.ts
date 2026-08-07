import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/register
 *
 * New philosophy: only agents can self-register. There are no client/call
 * center accounts anymore. Registration is FREE — no payment is required
 * to create an account or to apply for a job. The only gate to applying
 * is passing the per-job assessment.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, agentProfile } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email: normalizedEmail, password: hashedPassword, name,
        role: 'agent',
        phone: phone || null,
        isActive: true,
        accountStatus: 'active',
      },
    });

    // Create agent profile
    if (agentProfile) {
      await db.agent.create({
        data: {
          userId: user.id,
          country: agentProfile.country || null,
          languages: JSON.stringify(agentProfile.languages || []),
          skills: JSON.stringify(agentProfile.skills || []),
          experience: Number(agentProfile.experience) || 0,
          preferredShift: agentProfile.preferredShift || null,
          salaryExpectation: agentProfile.salaryExpectation ? Number(agentProfile.salaryExpectation) : null,
        },
      });
    } else {
      await db.agent.create({ data: { userId: user.id } });
    }

    return NextResponse.json({
      message: 'Account created successfully! You can now sign in.',
      requiresApproval: false,
      userId: user.id,
      user: {
        id: user.id, email: user.email, name: user.name,
        role: user.role, accountStatus: user.accountStatus, isActive: user.isActive,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/auth/register error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
