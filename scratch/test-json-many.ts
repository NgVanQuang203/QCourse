import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const deck = await prisma.deck.findFirst();
    if (!deck) return;
    
    const created = await prisma.card.createMany({
      data: [{
        deckId: deck.id,
        front: 'Test front',
        back: 'test_back_A',
        options: ['test_back_A', 'B', 'C', 'D'],
        correctOptionIndex: 0
      }]
    });
    
    console.log('Cards created via createMany:', created.count);
  } catch (e) {
    console.error('Error creating cards:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
