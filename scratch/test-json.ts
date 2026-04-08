import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const deck = await prisma.deck.findFirst();
    if (!deck) {
      console.log('No deck found');
      return;
    }
    
    // Test creating a card
    const card = await prisma.card.create({
      data: {
        deckId: deck.id,
        front: 'Test front',
        back: 'test_back_A',
        options: ['test_back_A', 'B', 'C', 'D'],
        correctOptionIndex: 0
      }
    });
    
    console.log('Card created successfully:', card.id);
  } catch (e) {
    console.error('Error creating card:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
