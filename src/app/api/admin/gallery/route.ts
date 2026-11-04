import { NextRequest, NextResponse } from 'next/server';
import { revalidateAllContent } from '@/lib/revalidate';
import { getAdminSession } from '@/lib/auth';
import { getGalleryItems, createGalleryItem } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await getGalleryItems({
      includeUnpublished: true,
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Error fetching admin gallery items:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, caption, altText, imageUrl, category, displayOrder, isPublished } = body;

    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return NextResponse.json(
        { error: 'Image file or URL is required' },
        { status: 400 }
      );
    }

    const newItem = await createGalleryItem({
      title: title ? title.trim() : '',
      caption: caption ? caption.trim() : null,
      altText: altText ? altText.trim() : (title ? title.trim() : ''),
      imageUrl: imageUrl.trim(),
      category: category && category.trim() ? category.trim() : 'General',
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    });

    revalidateAllContent(['/gallery', '/admin/gallery']);

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: any) {
    console.error('Error creating gallery item:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create gallery item' },
      { status: 500 }
    );
  }
}
