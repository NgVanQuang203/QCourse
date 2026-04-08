import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const session = await prisma.session.findFirst({
    include: { user: true }
  });
  if (!session) {
    console.log('No session found');
    return;
  }
  console.log('Session token:', session.sessionToken);
  
  const payload = {
    front: 'Test front',
    back: 'test_back_A',
    options: ['test_back_A', 'B', 'C', 'D'],
    correctOptionIndex: 0
  };

  const response = await fetch('http://localhost:3000/api/decks/cmnpvxkzj000ct83ss41i41tw/cards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'authjs.session-token=' + session.sessionToken
    },
    body: JSON.stringify(payload)
  });

  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Body:', text);
  await prisma.$disconnect();
}
main();
