import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { validateMediaFile, uploadToImageKit } from '@/lib/imagekit';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 1. Strict security validation (type, extension, mime, size)
    const mimeType = file.type || 'application/octet-stream';
    const validation = validateMediaFile(file.name, mimeType, file.size);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 2. Read array buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Upload to ImageKit server-side
    const cleanFolder = folder.replace(/[^a-z0-9_-]/gi, '');
    const uploadResult = await uploadToImageKit({
      file: buffer,
      fileName: file.name,
      folder: `/sherman-uploads/${cleanFolder}`,
      tags: ['sherman', cleanFolder, session.email],
    });

    if (!uploadResult?.url || !uploadResult?.fileId) {
      return NextResponse.json({ error: 'ImageKit rejected upload' }, { status: 502 });
    }

    // 4. Save metadata in PostgreSQL MediaAsset table
    let mediaAssetRecord = null;
    try {
      mediaAssetRecord = await prisma.mediaAsset.create({
        data: {
          fileName: uploadResult.name,
          fileUrl: uploadResult.url,
          fileType: uploadResult.fileType || mimeType,
          fileSize: uploadResult.size,
          altText: uploadResult.name.replace(/\.[^/.]+$/, ''),
        },
      });
    } catch (dbErr) {
      console.warn('[MediaAsset DB Warning]:', dbErr);
    }

    return NextResponse.json({
      url: uploadResult.url,
      fileId: uploadResult.fileId,
      filename: uploadResult.name,
      size: uploadResult.size,
      type: uploadResult.fileType || mimeType,
      thumbnailUrl: uploadResult.thumbnailUrl,
      assetId: mediaAssetRecord?.id,
    });
  } catch (error: any) {
    console.error('[Upload API Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload media to storage' },
      { status: 500 }
    );
  }
}
