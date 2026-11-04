import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(): string {
  const candidateUrls = [
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_DATABASE_URL,
    process.env.DATABASE_URL,
  ];

  for (const url of candidateUrls) {
    if (url && typeof url === 'string' && url.trim().length > 0) {
      const trimmed = url.trim();
      if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
        let cleanUrl = trimmed;
        if (!cleanUrl.includes('pool_timeout=')) {
          cleanUrl += (cleanUrl.includes('?') ? '&' : '?') + 'pool_timeout=45';
        }
        if (!cleanUrl.includes('connection_limit=')) {
          cleanUrl += '&connection_limit=10';
        }
        return cleanUrl;
      }
    }
  }

  return process.env.DATABASE_URL || '';
}

function createPrismaClient(): PrismaClient {
  const dbUrl = getDatabaseUrl();

  const isCloudflare =
    typeof (globalThis as any).WebSocketPair !== 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.userAgent?.includes('Cloudflare-Workers')) ||
    Boolean(process.env.CF_PAGES || process.env.WORKERS);

  // Use Neon driver adapter when running inside Cloudflare Workers environment
  if (isCloudflare && dbUrl && (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://'))) {
    try {
      const { Pool } = require('@neondatabase/serverless');
      const { PrismaNeon } = require('@prisma/adapter-neon');

      const pool = new Pool({ connectionString: dbUrl });
      pool.on('error', (err: any) => {
        console.warn('[Neon Pool Warning]:', err.message);
      });

      const adapter = new PrismaNeon(pool);
      return new PrismaClient({ adapter });
    } catch (adapterErr) {
      console.warn('Failed to initialize PrismaNeon adapter, falling back:', adapterErr);
    }
  }

  // Standard Node.js runtime (build-time Next.js, local migrations, seed scripts)
  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
