import { PrismaClient } from '@prisma/client/wasm';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';

// Enable stateless HTTP fetch in Neon Pool for maximum Cloudflare Workers edge compatibility
neonConfig.poolQueryViaFetch = true;

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

  try {
    const pool = new Pool({ connectionString: dbUrl });
    pool.on('error', (err: any) => {
      console.warn('[Neon Pool Warning]:', err?.message || err);
    });
    cachedPool = pool;
    const adapter = new PrismaNeon(pool);
    cachedPrisma = new PrismaClient({ adapter });
    return cachedPrisma;
  } catch (err: any) {
    console.error('[Prisma Client Init Error]:', err?.message || err);
    cachedPrisma = new PrismaClient();
    return cachedPrisma;
  }
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
