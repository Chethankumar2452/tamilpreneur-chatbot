// src/utils/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // Create default admin
  const passwordHash = await bcrypt.hash('Admin@2026', 12);

  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    create: {
      username: 'admin',
      email: 'admin@grandsangamam.in',
      passwordHash,
      role: 'superadmin',
    },
    update: {},
  });

  console.log('✅ Admin created: admin / Admin@2026');

  // Seed default FAQ knowledge
  const faqs = [
    {
      title: 'What is Grand Sangamam?',
      content: 'Grand Sangamam is a premier Tamil entrepreneurship summit organized by Tamilpreneur. It brings together entrepreneurs, investors, speakers, and innovators for networking, learning, and collaboration.',
      category: 'general',
    },
    {
      title: 'Registration Information',
      content: 'Registration for Grand Sangamam is available online through our website at tamilpreneur.in/grand-sangamam. Multiple ticket categories are available including Startup, Investor, and General passes.',
      category: 'registration',
    },
    {
      title: 'Contact Information',
      content: 'For queries, contact the Grand Sangamam team through the website contact form or reach out via the official Tamilpreneur social media channels.',
      category: 'support',
    },
  ];

  for (const faq of faqs) {
    await prisma.knowledgeBase.create({
      data: {
        ...faq,
        source: 'manual',
        embedding: [],
      },
    });
  }

  console.log('✅ Default knowledge base seeded');
  console.log('\n📌 Next steps:');
  console.log('  1. Login to admin at http://localhost:5174/admin/login');
  console.log('  2. Go to Knowledge Base → Re-index Website');
  console.log('  3. Configure API keys in Settings');

  await prisma.$disconnect();
}

seed().catch(console.error);
