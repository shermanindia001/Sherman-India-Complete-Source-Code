import { NextRequest, NextResponse } from 'next/server';
import { getR2Object } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { path?: string[] } }
) {
  try {
    const pathParts = params.path || [];
    if (pathParts.length === 0) {
      return new NextResponse('Media path missing', { status: 400 });
    }

    const key = pathParts.join('/');

    // 1. Fetch object from R2 or fallback
    const object = await getR2Object(key);
    if (!object || !object.body) {
      return new NextResponse('Media object not found', { status: 404 });
    }

    // 2. Check conditional ETag cache
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && object.etag && ifNoneMatch === object.etag) {
      return new NextResponse(null, { status: 304 });
    }

    // 3. Construct cached response
    const headers = new Headers();
    headers.set('Content-Type', object.contentType || 'application/octet-stream');
    headers.set('Content-Length', String(object.contentLength));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    if (object.etag) headers.set('ETag', object.etag);
    if (object.lastModified) headers.set('Last-Modified', object.lastModified.toUTCString());

    // ReadableStream or Buffer response
    return new NextResponse(object.body as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('[Media Proxy Error]:', error);
    return new NextResponse('Failed to retrieve media', { status: 500 });
  }
}
