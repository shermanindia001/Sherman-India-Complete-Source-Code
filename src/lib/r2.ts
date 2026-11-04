/**
 * Cloudflare R2 Object Storage Service
 *
 * Provides a resilient, dual-mode interface for interacting with the
 * `sherman-production-media` R2 bucket:
 * 1. Cloudflare Workers isolate: Native R2Bucket binding (`env.MEDIA_BUCKET`)
 * 2. Node.js runtime / scripts: AWS S3 compatible client (@aws-sdk/client-s3)
 * 3. Local development fallback: Local file system
 *
 * Never exposes R2 credentials to the client.
 */

import fs from 'fs';
import path from 'path';

export interface R2UploadOptions {
  key: string;
  buffer: Buffer | Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface R2ObjectResult {
  body: ReadableStream | Buffer | null;
  contentType: string;
  contentLength: number;
  etag?: string;
  lastModified?: Date;
}

function getR2BucketBinding(): any {
  // 1. Try OpenNext Cloudflare Context
  try {
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    if (ctx?.env?.MEDIA_BUCKET) {
      return ctx.env.MEDIA_BUCKET;
    }
  } catch (e) {
    // Not in OpenNext context
  }

  // 2. Try globalThis binding
  if (typeof (globalThis as any).MEDIA_BUCKET !== 'undefined') {
    return (globalThis as any).MEDIA_BUCKET;
  }

  return null;
}

function getS3Client(): any {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (accountId && accessKeyId && secretAccessKey) {
    try {
      const { S3Client } = require('@aws-sdk/client-s3');
      return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    } catch (e) {
      console.warn('[R2] Failed to initialize S3Client:', e);
    }
  }
  return null;
}

/**
 * Returns the public URL for an R2 object key.
 * Prioritizes custom domain (e.g., https://media.sherman-india.com/key)
 * or falls back to the Next.js media proxy (/api/media/key).
 */
export function getR2PublicUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, '');
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;

  if (publicDomain && publicDomain.startsWith('http')) {
    return `${publicDomain.replace(/\/+$/, '')}/${cleanKey}`;
  }

  // Fallback to internal media proxy
  return `/api/media/${cleanKey}`;
}

/**
 * Uploads a binary buffer to Cloudflare R2
 */
export async function uploadToR2(options: R2UploadOptions): Promise<{ url: string; key: string }> {
  const { key, buffer, contentType, metadata, cacheControl } = options;
  const cleanKey = key.replace(/^\/+/, '');
  const standardCacheControl = cacheControl || 'public, max-age=31536000, immutable';

  // 1. Native Cloudflare Worker R2 Binding
  const r2Binding = getR2BucketBinding();
  if (r2Binding) {
    await r2Binding.put(cleanKey, buffer, {
      httpMetadata: {
        contentType,
        cacheControl: standardCacheControl,
      },
      customMetadata: metadata,
    });
    return {
      url: getR2PublicUrl(cleanKey),
      key: cleanKey,
    };
  }

  // 2. S3 SDK (Node.js runtime / scripts)
  const s3 = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || 'sherman-production-media';
  if (s3) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: cleanKey,
        Body: Buffer.from(buffer),
        ContentType: contentType,
        CacheControl: standardCacheControl,
        Metadata: metadata,
      })
    );
    return {
      url: getR2PublicUrl(cleanKey),
      key: cleanKey,
    };
  }

  // 3. Local filesystem fallback for development when R2 is not bound
  try {
    const targetPath = path.join(process.cwd(), 'public', cleanKey);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, Buffer.from(buffer));
    return {
      url: `/${cleanKey}`,
      key: cleanKey,
    };
  } catch (fsErr) {
    throw new Error(`Failed to upload to R2 and local fallback failed: ${fsErr}`);
  }
}

/**
 * Retrieves an object from Cloudflare R2
 */
export async function getR2Object(key: string): Promise<R2ObjectResult | null> {
  const cleanKey = key.replace(/^\/+/, '');

  // 1. Native Cloudflare Worker R2 Binding
  const r2Binding = getR2BucketBinding();
  if (r2Binding) {
    const object = await r2Binding.get(cleanKey);
    if (!object) return null;
    return {
      body: object.body,
      contentType: object.httpMetadata?.contentType || 'application/octet-stream',
      contentLength: object.size,
      etag: object.httpEtag,
      lastModified: object.uploaded,
    };
  }

  // 2. S3 SDK
  const s3 = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || 'sherman-production-media';
  if (s3) {
    try {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const res = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: cleanKey }));
      return {
        body: res.Body,
        contentType: res.ContentType || 'application/octet-stream',
        contentLength: res.ContentLength || 0,
        etag: res.ETag,
        lastModified: res.LastModified,
      };
    } catch (e: any) {
      if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null;
      throw e;
    }
  }

  // 3. Local filesystem fallback
  const localPath = path.join(process.cwd(), 'public', cleanKey);
  if (fs.existsSync(localPath)) {
    const stat = fs.statSync(localPath);
    const ext = path.extname(localPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.gif': 'image/gif',
    };
    return {
      body: fs.readFileSync(localPath),
      contentType: mimeMap[ext] || 'application/octet-stream',
      contentLength: stat.size,
      etag: `"${stat.mtimeMs}"`,
      lastModified: stat.mtime,
    };
  }

  return null;
}

/**
 * Deletes an object from Cloudflare R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const cleanKey = key.replace(/^\/+/, '');

  // 1. Native Cloudflare Worker R2 Binding
  const r2Binding = getR2BucketBinding();
  if (r2Binding) {
    await r2Binding.delete(cleanKey);
    return true;
  }

  // 2. S3 SDK
  const s3 = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || 'sherman-production-media';
  if (s3) {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: cleanKey }));
    return true;
  }

  // 3. Local filesystem fallback
  try {
    const localPath = path.join(process.cwd(), 'public', cleanKey);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    return true;
  } catch (e) {
    return false;
  }
}
