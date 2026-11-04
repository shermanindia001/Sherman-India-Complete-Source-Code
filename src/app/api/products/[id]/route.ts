import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { revalidateAllContent } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { category: true, brand: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slugify(slug);
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (brandId !== undefined) updateData.brandId = brandId || null;
    if (shortDescription !== undefined) updateData.shortDescription = shortDescription;
    if (description !== undefined) updateData.description = description;
    if (specifications !== undefined) {
      updateData.specifications = typeof specifications === 'string' ? specifications : JSON.stringify(specifications);
    }
    if (features !== undefined) {
      updateData.features = typeof features === 'string' ? features : JSON.stringify(features);
    }
    if (applications !== undefined) {
      updateData.applications = typeof applications === 'string' ? applications : JSON.stringify(applications);
    }
    if (image !== undefined) updateData.image = image;
    if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    revalidateAllContent(['/admin/products', `/products/${product.slug}`]);

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export const PUT = PATCH;

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.product.delete({
      where: { id: params.id },
    });

    revalidateAllContent(['/admin/products']);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
