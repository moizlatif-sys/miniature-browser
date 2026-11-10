import 'dotenv/config';
import mongoose from 'mongoose';
import { mongoUri } from '../config';
import { runSeed } from './seed';

async function main() {
  const uri = mongoUri();
  const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 3000 }).asPromise();
  try {
    console.log(`Seeding ${uri}`);
    await runSeed(connection);
    console.log('Seed complete.');
  } finally {
    await connection.close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
