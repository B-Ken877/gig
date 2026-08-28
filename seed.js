// seed.js — reset passwords and create sample data with video assessment questions
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

  console.log('Resetting test agent password...');
  await prisma.user.update({
    where: { email: 'testagent@test.com' },
    data: { password: hashedPassword },
  });
  console.log('  Test agent password reset to: Admin123!');

  // Clean old data
  console.log('Cleaning old data...');
  await prisma.videoResponse.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.placement.deleteMany();
  await prisma.salaryDate.deleteMany();
  await prisma.jobPost.deleteMany();
  await prisma.provider.deleteMany();
  // Also clean old Assessment table if it exists
  try { await prisma.assessment.deleteMany(); } catch {}
  console.log('  Old data cleared.');

  // Create sample providers
  console.log('Creating sample providers...');
  const providers = [
    { name: 'Miguel Sanchez', phone: '+1 305 555 0100', email: 'miguel.sanchez@email.com', notes: 'Provides customer support and sales campaigns.' },
    { name: 'Sandra Thompson', phone: '+1 876 555 0200', email: 'sandra.thompson@email.com', notes: 'Specializes in bilingual agent placements.' },
    { name: 'John Bernard', phone: '+509 5555 0300', email: 'john.bernard@email.com', notes: 'Tech support campaigns.' },
  ];
  for (const p of providers) {
    await prisma.provider.create({ data: p });
    console.log('  Created provider:', p.name);
  }

  const allProviders = await prisma.provider.findMany();
  const providerMap = new Map(allProviders.map(p => [p.name, p]));

  // Create sample job posts WITH video assessment questions (5 each)
  console.log('Creating sample job posts with video assessment questions...');
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
      providerId: providerMap.get('Miguel Sanchez')?.id || null,
      commission: 15,
      assessmentQuestions: [
        'Tell us about yourself and why you are interested in this customer support role.',
        'Describe a time when you had to deal with a difficult customer. How did you handle the situation?',
        'What does excellent customer service mean to you? Give an example.',
        'How do you handle working under pressure and meeting performance targets?',
        'What are your salary expectations and when can you start?',
      ],
      isActive: true,
    },
    {
      jobTitle: 'Bilingual Technical Support Specialist',
      description: 'Provide Level 1 technical support for a SaaS platform. Troubleshoot login issues, billing questions, and basic product configuration. Must be fluent in English and Spanish.',
      skills: ['Technical Support', 'Bilingual', 'SaaS', 'Troubleshooting', 'Spanish', 'English'],
      requirements: ['6+ months tech support experience', 'Fluent in English AND Spanish', 'Familiar with help desk software', 'Strong problem-solving skills', 'Computer with 8GB+ RAM'],
      hourlyRate: 8.00,
      payFrequency: 'bi-weekly',
      category: 'Technical Support',
      shift: 'Flexible',
      location: 'Remote — Caribbean',
      providerId: providerMap.get('Sandra Thompson')?.id || null,
      commission: 20,
      assessmentQuestions: [
        'Introduce yourself in both English and Spanish. Tell us about your tech support experience.',
        'Walk us through how you would troubleshoot a customer who cannot log into their account.',
        'Describe a complex technical issue you resolved for a customer. What was your process?',
        'How do you stay calm when a customer is frustrated with a technical problem?',
        'What tools or software are you most comfortable using for technical support?',
      ],
      isActive: true,
    },
    {
      jobTitle: 'Sales & Outbound Agent',
      description: 'Outbound calling campaign for a B2B software company. Generate leads, qualify prospects, and schedule demos for the sales team.',
      skills: ['Sales', 'Outbound Calling', 'Lead Generation', 'CRM', 'Communication'],
      requirements: ['6+ months sales or telemarketing experience', 'Confident phone presence', 'Goal-oriented and self-motivated', 'Quiet workspace', 'Reliable internet'],
      hourlyRate: 7.00,
      payFrequency: 'weekly',
      category: 'Sales',
      shift: 'Morning',
      location: 'Remote — Caribbean',
      providerId: providerMap.get('John Bernard')?.id || null,
      commission: 25,
      assessmentQuestions: [
        'Tell us about your sales experience and why you are passionate about sales.',
        'Sell us a common household object (pen, mug, etc.) in 60 seconds.',
        'How do you handle rejection and stay motivated after a tough call?',
        'Describe your approach to qualifying a lead. What questions do you ask?',
        'What are your weekly sales targets and how do you plan to achieve them?',
      ],
      isActive: true,
    },
    {
      jobTitle: 'Live Chat Support Agent',
      description: 'Manage 3-4 simultaneous live chat conversations for an e-commerce brand.',
      skills: ['Live Chat', 'Customer Support', 'Multitasking', 'E-commerce', 'Typing 60+ WPM'],
      requirements: ['Typing speed 60+ WPM', '6+ months chat or customer support experience', 'Strong written communication', 'Ability to multitask', 'Reliable internet'],
      hourlyRate: 5.50,
      payFrequency: 'bi-weekly',
      category: 'Live Chat',
      shift: 'Afternoon',
      location: 'Remote — Caribbean',
      providerId: providerMap.get('Miguel Sanchez')?.id || null,
      commission: 10,
      assessmentQuestions: [
        'Why are you interested in live chat support specifically (vs phone support)?',
        'How do you manage multiple conversations at once without losing track?',
        'Write a sample chat response to: "My order is 3 days late and I need it urgently!"',
        'What do you do if you do not know the answer to a customer question immediately?',
        'How do you maintain a friendly tone in writing when you are busy?',
      ],
      isActive: true,
    },
    {
      jobTitle: 'Email Support Specialist',
      description: 'Manage a shared inbox for a subscription-based service. Respond to customer emails within 4 business hours.',
      skills: ['Email Support', 'Customer Support', 'Writing', 'Attention to Detail'],
      requirements: ['Excellent written English', '6+ months email or ticket support experience', 'Detail-oriented', 'Patient and empathetic', 'Reliable internet'],
      hourlyRate: 6.00,
      payFrequency: 'bi-weekly',
      category: 'Email Support',
      shift: 'Flexible',
      location: 'Remote — Caribbean',
      providerId: null,
      commission: 0,
      assessmentQuestions: [
        'Tell us about your experience with email or ticket-based support.',
        'How do you prioritize emails when you have 50 unread in your inbox?',
        'Write a professional email response to a customer requesting a refund for a defective product.',
        'How do you handle a customer who has emailed multiple times and is clearly frustrated?',
        'What does "SLA compliance" mean to you and how do you ensure you meet it?',
      ],
      isActive: true,
    },
  ];

  for (const job of jobs) {
    await prisma.jobPost.create({
      data: {
        ...job,
        skills: JSON.stringify(job.skills),
        requirements: JSON.stringify(job.requirements),
        assessmentQuestions: JSON.stringify(job.assessmentQuestions),
      },
    });
    console.log('  Created job:', job.jobTitle, '— with', job.assessmentQuestions.length, 'assessment questions');
  }

  // Create salary dates
  console.log('Creating salary dates...');
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + (14 * i) + 7);
    d.setHours(0, 0, 0, 0);
    await prisma.salaryDate.create({
      data: { payDate: d, frequency: 'bi-weekly', description: i === 0 ? 'Next pay cycle' : 'Pay cycle ' + (i + 1) },
    });
    console.log('  Created salary date:', d.toISOString().split('T')[0]);
  }

  console.log('\n=== Seed complete ===');
  console.log('Admin login: admin@gigsolutions.com / Admin123!');
  console.log('Agent login: testagent@test.com / Admin123!');
}

main()
  .catch((e) => { console.error('Seed error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
