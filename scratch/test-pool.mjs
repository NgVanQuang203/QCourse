import { Pool } from '@neondatabase/serverless';

try {
  const url = process.env.DATABASE_URL || 'postgresql://fake:fake@local/fake';
  console.log('Testing with url length:', url.length);
  const pool = new Pool({ connectionString: url });
  console.log('Pool created successfully');
} catch (e) {
  console.error('Pool creation failed:', e.message);
}
