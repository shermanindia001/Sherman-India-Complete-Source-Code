import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get('category');
  const brandSlug = searchParams.get('brand');
  const featured = searchParams.get('featured');
  const search = searchParams.get('search');
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  const isCompact = searchParams.get('compact') === 'true';

  try {
    const where: any = { isPublished: true };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    if (brandSlug) {
      where.brand = { slug: brandSlug };
    }
    if (featured === 'true') {
      where.isFeatured = true;
    }
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    const compactSelect = {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      image: true,
      isFeatured: true,
      displayOrder: true,
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true, logo: true } },
    };

    let products;
    let pagination = null;

    if (pageParam || limitParam) {
      const page = Math.max(1, parseInt(pageParam || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20', 10)));
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        isCompact
          ? prisma.product.findMany({
              where,
              select: compactSelect,
              orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
              skip,
              take: limit,
            })
          : prisma.product.findMany({
              where,
              include: { category: true, brand: true },
              orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
              skip,
              take: limit,
            }),
        prisma.product.count({ where }),
      ]);

      products = items;
      pagination = {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } else {
      products = isCompact
        ? await prisma.product.findMany({
            where,
            select: compactSelect,
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
          })
        : await prisma.product.findMany({
            where,
            include: { category: true, brand: true },
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
          });
    }

    const response = NextResponse.json(pagination ? { products, pagination } : { products });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return response;
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      name,
      slug,
      categoryId,
      brandId,
      shortDescription,
      description,
      specifications,
      features,
      applications,
      image,
      isPublished,
      isFeatured,
      displayOrder,
    } = body;

    if (!name || !categoryId || !description) {
      return NextResponse.json(
        { error: 'Name, category, and description are required.' },
        { status: 400 }
      );
    }

    const finalSlug = slug ? slugify(slug) : slugify(name);

    const product = await prisma.product.create({
      data: {
        name,
        slug: finalSlug,
        categoryId,
        brandId: brandId || null,
        shortDescription: shortDescription || null,
        description,
        specifications: typeof specifications === 'string' ? specifications : JSON.stringify(specifications || []),
        features: typeof features === 'string' ? features : JSON.stringify(features || []),
        applications: typeof applications === 'string' ? applications : JSON.stringify(applications || []),
        image: image || null,
        isPublished: isPublished ?? true,
        isFeatured: isFeatured ?? false,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
      },
    });

    try {
      revalidatePath('/');
      revalidatePath('/products');
      revalidatePath('/admin/products');
    } catch (e) {}

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error.code === 'P2002' ? 'Product slug already exists' : 'Failed to create product' },
      { status: 500 }
    );
  }
}
