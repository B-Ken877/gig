// seed.js — reset admin password and create sample data
// Run with: cd /root/gig-src && node seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting admin password...');
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  await prisma.user.update({
    where: { email: 'admin@gigsolutions.com' },
    data: { password: hashedPassword },
  });
  console.log('  Admin password reset to: Admin123!');

  // Also reset the test agent password
  console.log('Resetting test agent password...');
  await prisma.user.update({
    where: { email: 'testagent@test.com' },
    data: { password: hashedPassword },
  });
  console.log('  Test agent password reset to: Admin123!');

  // Create sample providers
  console.log('Creating sample providers...');
  const providers = [
    { name: 'Telus International', contactPerson: 'Miguel Sanchez', phone: '+1 305 555 0100', email: 'miguel@telus-intl.com', notes: 'Long-term partner for customer support roles.' },
    { name: 'Caribbean BPO Solutions', contactPerson: 'Sandra Thompson', phone: '+1 876 555 0200', email: 'sandra@caribbpo.com', notes: 'Specializes in bilingual agents.' },
    { name: 'TechCall Inc.', contactPerson: 'John Bernard', phone: '+509 5555 0300', email: 'john@techcall.com', notes: 'Tech support campaigns.' },
  ];

  for (const p of providers) {
    const existing = await prisma.provider.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.provider.create({ data: p });
      console.log('  Created provider:', p.name);
    } else {
      console.log('  Provider already exists:', p.name);
    }
  }

  // Fetch providers for job posts
  const allProviders = await prisma.provider.findMany();
  const providerMap = new Map(allProviders.map(p => [p.name, p]));

  // Create sample job posts
  console.log('Creating sample job posts...');
  const jobs = [
    {
      jobTitle: 'Customer Support Agent — English',
      description: 'Handle inbound customer inquiries for a US-based e-commerce company. You will assist customers with order tracking, returns, refunds, and product questions. Training is provided.\n\nResponsibilities:\n• Answer 40-60 calls per shift\n• Resolve customer issues on first contact\n• Document all interactions in the CRM\n• Meet quality and productivity targets',
      skills: ['Customer Support', 'Communication', 'CRM', 'English'],
      requirements: ['Minimum 1 year customer service experience', 'Excellent English communication skills', 'Quiet home office environment', 'Reliable internet (25 Mbps+)', 'USB headset with noise cancellation'],
      hourlyRate: 6.50,
      payFrequency: 'bi-weekly',
      category: 'Customer Support',
      shift: 'Night',
      location: 'Remote — Caribbean',
      providerId: providerMap.get('Telus International')?.id || null,
      commission: 200,
      isActive: true,
    },
    {
      jobTitle: 'Bilingual Technical Support Specialist',
      description: 'Provide Level 1 technical support for a SaaS platform. Troubleshoot login issues, billing questions, and basic product configuration. Must be fluent in English and Spanish.\n\nResponsibilities:\n• Handle 30-40 support tickets per shift via chat and email\n• Escalate complex issues to Tier 2\n• Contribute to knowledge base articles\n• Participate in weekly team meetings',
      skills: ['Technical Support', 'Bilingual', 'SaaS', 'Troubleshooting', 'Spanish', 'English'],
      requirements: ['6+ months tech support experience', 'Fluent in English AND Spanish', 'Familiar with help desk software', 'Strong problem-solving skills', 'Computer with 8GB+ RAM'],
      hourlyRate: 8.00,
      payFrequency: 'bi-weekly',
      category: 'Technical Support',
      shift: 'Flexible',
      location: 'Remote — Caribbean',
      providerId: providerMap.get('Caribbean BPO Solutions')?.id || null,
      commission: 250,
      isActive: true,
    },
    {
      jobTitle: 'Sales & Outbound Agent',
      description: 'Outbound calling campaign for a B2B software company. Generate leads, qualify prospects, and schedule demos for the sales team. Commission on top of base pay.\n\nResponsibilities:\n• Make 80-100 outbound calls per shift\n• Follow provided scripts and objection handling\n• Update CRM with call outcomes\n• Hit weekly meeting-set targets',
      skills: ['Sales', 'Outbound Calling', 'Lead Generation', 'CRM', 'Communication'],
      requirements: ['6+ months sales or telemarketing experience', 'Confident phone presence', 'Goal-oriented and self-motivated', 'Quiet workspace', 'Reliable internet'],
      hourlyRate: 7.00,
      payFrequency: 'weekly',
      category: 'Sales',
      shift: 'Morning',
      location: 'Remote — Caribbean',
      providerId: providerMap.get('TechCall Inc.')?.id || null,
      commission: 300,
      isActive: true,
    },
    {
      jobTitle: 'Live Chat Support Agent',
      description: 'Manage 3-4 simultaneous live chat conversations for an e-commerce brand. Provide product recommendations, answer questions, and resolve issues in real-time.\n\nResponsibilities:\n• Handle 3-4 concurrent chat sessions\n• Maintain response time under 60 seconds\n• Upsell when appropriate\n• Document complex issues for follow-up',
      skills: ['Live Chat', 'Customer Support', 'Multitasking', 'E-commerce', 'Typing 60+ WPM'],
      requirements: ['Typing speed 60+ WPM', '6+ months chat or customer support experience', 'Strong written communication', 'Ability to multitask', 'Reliable internet'],
      hourlyRate: 5.50,
      payFrequency: 'bi-weekly',
      category: 'Live Chat',
      shift: 'Afternoon',
      location: 'Remote — Caribbean',
      providerId: providerMap.get('Telus International')?.id || null,
      commission: 150,
      isActive: true,
    },
    {
      jobTitle: 'Email Support Specialist',
      description: 'Manage a shared inbox for a subscription-based service. Respond to customer emails within 4 business hours with professional, accurate, and empathetic communication.\n\nResponsibilities:\n• Process 40-60 emails per shift\n• Maintain 98%+ quality score\n• Identify trends and escalate recurring issues\n• Collaborate with Tier 2 on complex cases',
      skills: ['Email Support', 'Customer Support', 'Writing', 'Attention to Detail'],
      requirements: ['Excellent written English', '6+ months email or ticket support experience', 'Detail-oriented', 'Patient and empathetic', 'Reliable internet'],
      hourlyRate: 6.00,
      payFrequency: 'bi-weekly',
      category: 'Email Support',
      shift: 'Flexible',
      location: 'Remote — Caribbean',
      providerId: null, // internal — no provider assigned
      commission: 0,
      isActive: true,
    },
  ];

  for (const job of jobs) {
    const existing = await prisma.jobPost.findFirst({ where: { jobTitle: job.jobTitle } });
    if (!existing) {
      await prisma.jobPost.create({
        data: {
          ...job,
          skills: JSON.stringify(job.skills),
          requirements: JSON.stringify(job.requirements),
        },
      });
      console.log('  Created job:', job.jobTitle);
    } else {
      console.log('  Job already exists:', job.jobTitle);
    }
  }

  // Create sample salary dates
  console.log('Creating salary dates...');
  const now = new Date();
  const salaryDates = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + (14 * i) + 7); // every 2 weeks, starting next week
    d.setHours(0, 0, 0, 0);
    salaryDates.push({
      payDate: d,
      frequency: 'bi-weekly',
      description: i === 0 ? 'Next pay cycle' : `Pay cycle ${i + 1}`,
    });
  }
  for (const sd of salaryDates) {
    const existing = await prisma.salaryDate.findFirst({ where: { payDate: sd.payDate } });
    if (!existing) {
      await prisma.salaryDate.create({ data: sd });
      console.log('  Created salary date:', sd.payDate.toISOString().split('T')[0]);
    }
  }

  console.log('\n=== Seed complete ===');
  console.log('Admin login: admin@gigsolutions.com / Admin123!');
  console.log('Agent login: testagent@test.com / Admin123!');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
