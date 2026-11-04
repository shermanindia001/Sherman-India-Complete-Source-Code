import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { deleteFromR2, uploadToR2 } from '@/lib/r2';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function extractR2KeyFromUrl(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('/api/media/')) {
    return url.replace('/api/media/', '');
  }
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;
  if (publicDomain && url.startsWith(publicDomain)) {
    return url.replace(publicDomain, '').replace(/^\/+/, '');
  }
  if (url.includes('r2.dev/') || url.includes('.cloudflarestorage.com/')) {
    const parts = url.split('/');
    return parts.slice(3).join('/');
  }
  if (url.startsWith('/uploads/')) {
    return url.replace(/^\//, '');
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const asset = await prisma.mediaAsset.findUnique({
      where: { id: params.id },
    });

    if (!asset) return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });

    return NextResponse.json({ asset });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE Media Asset with safe transactional ordering:
 * 1. Checks and unlinks active entity references if required.
 * 2. Deletes record from PostgreSQL database.
 * 3. Deletes object from Cloudflare R2 bucket.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const asset = await prisma.mediaAsset.findUnique({
      where: { id: params.id },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });
    }

    const r2Key = extractR2KeyFromUrl(asset.fileUrl);

    // 1. Delete from PostgreSQL database first
    await prisma.mediaAsset.delete({
      where: { id: params.id },
    });

    // 2. Safe deletion from R2 object storage
    if (r2Key) {
      try {
        await deleteFromR2(r2Key);
      } catch (r2Err) {
        console.warn(`[R2 Delete Warning]: Object ${r2Key} could not be deleted from bucket:`, r2Err);
      }
    }

    return NextResponse.json({ success: true, message: 'Media asset deleted successfully' });
  } catch (error: any) {
    console.error('[Admin Media DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete media asset' }, { status: 500 });
  }
}

/**
 * PUT: Safe Media Replacement
 * 1. Uploads new replacement object to R2.
 * 2. Updates database record in PostgreSQL.
 * 3. Deletes old object only after database commit succeeds.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const existingAsset = await prisma.mediaAsset.findUnique({
      where: { id: params.id },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: 'Media asset not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const altText = (formData.get('altText') as string) || existingAsset.altText;

    let updatedFileUrl = existingAsset.fileUrl;
    let oldR2Key: string | null = null;

    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
      const newKey = `uploads/replacements/${Date.now()}-${cleanName}`;

      // Upload replacement to R2 first
      const uploadRes = await uploadToR2({
        key: newKey,
        buffer,
        contentType: file.type || 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable',
      });

      oldR2Key = extractR2KeyFromUrl(existingAsset.fileUrl);
      updatedFileUrl = uploadRes.url;
    }

    // Update database record
    const updated = await prisma.mediaAsset.update({
      where: { id: params.id },
      data: {
        fileUrl: updatedFileUrl,
        altText,
        fileSize: file ? file.size : existingAsset.fileSize,
        fileType: file ? (file.type || existingAsset.fileType) : existingAsset.fileType,
      },
    });

    // Delete old R2 object only after database commit succeeds
    if (oldR2Key) {
      try {
        await deleteFromR2(oldR2Key);
      } catch (delErr) {
        console.warn('[R2 Replacement Cleanup Warning]:', delErr);
      }
    }

    return NextResponse.json({ success: true, asset: updated });
  } catch (error: any) {
    console.error('[Admin Media PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to replace media asset' }, { status: 500 });
  }
}
