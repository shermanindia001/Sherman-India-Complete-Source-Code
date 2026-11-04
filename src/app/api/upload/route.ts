import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { validateImageFile } from '@/lib/image';
import { uploadToR2 } from '@/lib/r2';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate image format and file size
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean filename
    const timestamp = Date.now();
    const cleanName = file.name.toLowerCase().replace(/[^a-z0-9.]/g, '-');
    const safeFolder = folder.replace(/[^a-z0-9_-]/gi, '');
    const filename = `${timestamp}-${cleanName}`;
    const r2Key = `uploads/${safeFolder}/${filename}`;

    // Upload to Cloudflare R2 with immutable caching headers
    const uploadResult = await uploadToR2({
      key: r2Key,
      buffer,
      contentType: file.type || 'image/jpeg',
      metadata: {
        originalName: file.name,
        uploadedBy: session.email,
        uploadedAt: new Date().toISOString(),
      },
      cacheControl: 'public, max-age=31536000, immutable',
    });

    const publicUrl = uploadResult.url;

    // Track in MediaAsset table in PostgreSQL
    let mediaAssetRecord = null;
    try {
      mediaAssetRecord = await prisma.mediaAsset.create({
        data: {
          fileName: filename,
          fileUrl: publicUrl,
          fileType: file.type || 'image/jpeg',
          fileSize: file.size,
          altText: cleanName.replace(/\.[^/.]+$/, ''),
        },
      });
    } catch (dbErr) {
      console.warn('[MediaAsset Log Warning]:', dbErr);
    }

    return NextResponse.json({
      url: publicUrl,
      key: r2Key,
      filename,
      size: file.size,
      type: file.type,
      assetId: mediaAssetRecord?.id,
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload file to object storage' },
      { status: 500 }
    );
  }
}
