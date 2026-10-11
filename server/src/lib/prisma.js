import { PrismaClient } from '@prisma/client';

export const prisma = globalThis.__dalliPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__dalliPrisma = prisma;
