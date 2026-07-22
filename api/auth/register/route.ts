import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/register
 *
 *  Registration is now FREE for both agents and call centers.
 *  No PaymentRequest is created at signup. The user can sign in
 *  immediately and explore the platform. Payment is only asked:
 *    - Agents:        when they try to apply for a job
 *    - Call centers:  when they try to access the "Job Links" tab
 *
 *  The admin toggles `paid=true` after approving the payment in the
 *  payment chat (see /api/users/mark-paid).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role, phone, agentProfile, clientProfile } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const effectiveRole = role || 'client';
    if (effectiveRole !== 'agent' && effectiveRole !== 'client') {
      return NextResponse.json({ error: 'Only agent and client accounts can be self-registered' }, { status: 403 });
    }

    // Normalize email — lowercase + trim. The login route does the same,
    // so without this users who type "John@..." can't log in after registering
    // with "john@...".
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
        role: effectiveRole,
        phone: phone || null,
        // Free registration — account is active immediately.
        isActive: true,
        accountStatus: 'active',
        // Payment is deferred until the user tries to use a gated feature.
        paid: false,
      },
    });

    // Create role-specific profile
    if (effectiveRole === 'agent' && agentProfile) {
      await db.agent.create({
        data: {
          userId: user.id,
          country: agentProfile.country || null,
          languages: JSON.stringify(agentProfile.languages || []),
          skills: JSON.stringify(agentProfile.skills || []),
          experience: agentProfile.experience || 0,
          preferredShift: agentProfile.preferredShift || null,
          salaryExpectation: agentProfile.salaryExpectation || null,
        },
      });
    } else if (effectiveRole === 'agent') {
      await db.agent.create({ data: { userId: user.id } });
    }

    if (effectiveRole === 'client' && clientProfile) {
      await db.client.create({
        data: {
          userId: user.id,
          companyName: clientProfile.companyName || name,
          industry: clientProfile.industry || null,
          contactPerson: name,
          phone: phone || clientProfile.phone || null,
          companyLink: clientProfile.companyLink || null,
        },
      });
    } else if (effectiveRole === 'client') {
      await db.client.create({
        data: { userId: user.id, companyName: name, contactPerson: name },
      });
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
