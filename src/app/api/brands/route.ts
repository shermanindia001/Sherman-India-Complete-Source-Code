import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { revalidateAllContent } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
    const res = NextResponse.json({ brands });
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug, logo, websiteUrl, description, displayOrder, isActive } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug: slug ? slugify(slug) : slugify(name),
        logo: logo || null,
        websiteUrl: websiteUrl || null,
        description: description || null,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        isActive: isActive ?? true,
      },
    });

    revalidateAllContent(['/admin/brands']);

    return NextResponse.json({ success: true, brand }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating brand:', error);
    return NextResponse.json(
      { error: error.code === 'P2002' ? 'Brand slug already exists' : 'Failed to create brand' },
      { status: 500 }
    );
  }
}
