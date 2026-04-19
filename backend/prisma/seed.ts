import { PrismaClient, PresenceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@chat.local' },
    update: {},
    create: {
      email: 'admin@chat.local',
      username: 'admin',
      passwordHash,
      isAdmin: true,
      presence: { create: { status: PresenceStatus.OFFLINE } },
    },
  });
  console.log('Seeded admin user:', admin.username);

  // Sample user
  const userHash = await bcrypt.hash('User1234!', 12);
  const sampleUser = await prisma.user.upsert({
    where: { email: 'alice@chat.local' },
    update: {},
    create: {
      email: 'alice@chat.local',
      username: 'alice',
      passwordHash: userHash,
      presence: { create: { status: PresenceStatus.OFFLINE } },
    },
  });
  console.log('Seeded sample user:', sampleUser.username);

  // Public room 1
  const room1 = await prisma.room.upsert({
    where: { name: 'general' },
    update: {},
    create: {
      name: 'general',
      description: 'General discussion',
      isPublic: true,
      ownerId: admin.id,
      members: { create: { userId: admin.id, isAdmin: true } },
    },
  });
  console.log('Seeded room:', room1.name);

  // Public room 2
  const room2 = await prisma.room.upsert({
    where: { name: 'random' },
    update: {},
    create: {
      name: 'random',
      description: 'Random chatter',
      isPublic: true,
      ownerId: admin.id,
      members: { create: { userId: admin.id, isAdmin: true } },
    },
  });
  console.log('Seeded room:', room2.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
