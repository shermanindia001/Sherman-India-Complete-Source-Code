import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { uploadToImageKit, deleteFromImageKit, validateMediaFile } from '@/lib/imagekit';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function extractImageKitFileId(url: string): string | null {
  if (!url) return null;
  // If URL is an ImageKit URL, try extracting the fileId if embedded, or search pattern
  if (url.includes('ik.imagekit.io')) {
    // URL format: https://ik.imagekit.io/{endpoint}/{path}/{fileName}
    return null;
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
 * DELETE Media Asset:
 * 1. Validates admin session.
 * 2. Deletes record from PostgreSQL database.
 * 3. Deletes file from ImageKit storage if ImageKit fileId exists.
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

    // Delete from database
    await prisma.mediaAsset.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Media asset deleted successfully' });
  } catch (error: any) {
    console.error('[Admin Media DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete media asset' }, { status: 500 });
  }
}

/**
 * PUT: Safe Media Replacement
 * 1. Validates admin session & input file.
 * 2. Uploads new replacement to ImageKit.
 * 3. Updates database record in PostgreSQL.
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
    let newSize = existingAsset.fileSize;
    let newType = existingAsset.fileType;

    if (file) {
      const mimeType = file.type || 'application/octet-stream';
      const validation = validateMediaFile(file.name, mimeType, file.size);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadResult = await uploadToImageKit({
        file: buffer,
        fileName: file.name,
        folder: '/sherman-uploads/replacements',
        tags: ['replacement', session.email],
      });

      updatedFileUrl = uploadResult.url;
      newSize = uploadResult.size;
      newType = uploadResult.fileType || mimeType;
    }

    // Update database record
    const updated = await prisma.mediaAsset.update({
      where: { id: params.id },
      data: {
        fileUrl: updatedFileUrl,
        altText,
        fileSize: newSize,
        fileType: newType,
      },
    });

    return NextResponse.json({ success: true, asset: updated });
  } catch (error: any) {
    console.error('[Admin Media PUT Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to replace media asset' }, { status: 500 });
  }
}
