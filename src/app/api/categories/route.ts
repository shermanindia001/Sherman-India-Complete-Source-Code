import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { revalidateAllContent } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await prisma.productCategory.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
    const res = NextResponse.json({ categories });
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug, description, image, icon, displayOrder, isActive } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const category = await prisma.productCategory.create({
      data: {
        name,
        slug: slug ? slugify(slug) : slugify(name),
        description: description || null,
        image: image || null,
        icon: icon || null,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        isActive: isActive ?? true,
      },
    });

    revalidateAllContent(['/admin/categories']);

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: error.code === 'P2002' ? 'Category slug already exists' : 'Failed to create category' },
      { status: 500 }
    );
  }
}
