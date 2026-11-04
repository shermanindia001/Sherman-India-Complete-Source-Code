import { NextRequest, NextResponse } from 'next/server';
import { revalidateAllContent } from '@/lib/revalidate';
import { getAdminSession } from '@/lib/auth';
import { getGalleryItemById, updateGalleryItem, deleteGalleryItem } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const item = await getGalleryItemById(params.id);
    if (!item) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Error fetching gallery item:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery item' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, caption, altText, imageUrl, category, displayOrder, isPublished } = body;

    const updated = await updateGalleryItem(params.id, {
      ...(title !== undefined && { title }),
      ...(caption !== undefined && { caption }),
      ...(altText !== undefined && { altText }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(category !== undefined && { category }),
      ...(displayOrder !== undefined && { displayOrder }),
      ...(isPublished !== undefined && { isPublished }),
    });

    revalidateAllContent(['/gallery', '/admin/gallery']);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating gallery item:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update gallery item' },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteGalleryItem(params.id);

    revalidateAllContent(['/gallery', '/admin/gallery']);

    return NextResponse.json({ success: true, message: 'Gallery item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting gallery item:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete gallery item' },
      { status: 500 }
    );
  }
}
