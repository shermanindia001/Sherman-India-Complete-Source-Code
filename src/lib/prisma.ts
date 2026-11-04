import { PrismaClient } from '@prisma/client';
import { Pool } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

let cachedPrisma: PrismaClient | null = null;
let cachedPool: Pool | null = null;

function getCleanDatabaseUrl(): string {
  const candidateUrls = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_DATABASE_URL,
  ];

  for (const url of candidateUrls) {
    if (url && typeof url === 'string' && url.trim().length > 0) {
      const trimmed = url.trim();
      if (trimmed.startsWith('postgresql://') || trimmed.startsWith('postgres://')) {
        return trimmed;
      }
    }
  }

  return '';
}

export function getPrismaClient(): PrismaClient {
  if (cachedPrisma) {
    return cachedPrisma;
  }

  const dbUrl = getCleanDatabaseUrl();

  const isCloudflare =
    typeof (globalThis as any).WebSocketPair !== 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.userAgent?.toLowerCase().includes('cloudflare')) ||
    Boolean(process.env.CF_PAGES || process.env.WORKERS || process.env.CLOUDFLARE_BUILD_ENVIRONMENT);

  if (dbUrl && (isCloudflare || typeof (globalThis as any).WebSocket !== 'undefined')) {
    try {
      const pool = new Pool({ connectionString: dbUrl });
      pool.on('error', (err: any) => {
        console.warn('[Neon Pool Warning]:', err.message);
      });
      cachedPool = pool;
      const adapter = new PrismaNeon(pool);
      cachedPrisma = new PrismaClient({ adapter });
      return cachedPrisma;
    } catch (adapterErr) {
      console.warn('PrismaNeon adapter init failed, falling back:', adapterErr);
    }
  }

  cachedPrisma = new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return cachedPrisma;
}

// Transparent Proxy ensures lazy instantiation inside request context
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient();
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});

export default prisma;
