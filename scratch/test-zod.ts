import { z } from 'zod';

const CardSchema = z.object({
  front:              z.string().min(1),
  back:               z.string().min(1),
  hint:               z.string().optional(),
  imageUrl:           z.string().url().optional(),
  options:            z.array(z.string()).length(4).optional(),
  correctOptionIndex: z.number().min(0).max(3).optional(),
});

const BulkSchema = z.object({
  cards: z.array(CardSchema).min(1).max(500),
});

const data = {
  cards: [
    { deckId: 'cm902ndp50002um5cxto51111', front: 'test', back: 'test' }
  ]
};

const result = BulkSchema.safeParse(data);
console.log(JSON.stringify(result));
