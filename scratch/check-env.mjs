import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

console.log('--- DB DIAGNOSTICS ---');
console.log('Current CWD:', process.cwd());

const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');

console.log('.env.local exists:', fs.existsSync(envLocalPath));
console.log('.env exists:', fs.existsSync(envPath));

const result = config({ path: envLocalPath });
console.log('Dotenv load result:', result.error ? 'FAILED' : 'SUCCESS');

console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 15));
}
console.log('----------------------');
