import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

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

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email, password: hashedPassword, name,
        role: effectiveRole,
        phone: phone || null,
        isActive: false,
        accountStatus: 'pending_approval',
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

    // Create payment request
    const feeType = effectiveRole === 'agent' ? 'annual' : 'monthly';
    const amount = effectiveRole === 'agent' ? 2000 : 3000;
    await db.paymentRequest.create({
      data: {
        userId: user.id,
        role: effectiveRole,
        feeType,
        amount,
        currency: 'HTG',
        status: 'pending',
      },
    });

    return NextResponse.json({
      message: 'Account created! Please complete your onboarding payment to activate your account.',
      requiresApproval: true,
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