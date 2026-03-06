import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Next.js in development mode clears Node.js cache on hot-reload.
// This global variable prevents Next.js from spawning duplicate database connections.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in the environment variables.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Pass the adapter to the Prisma client constructor
export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;