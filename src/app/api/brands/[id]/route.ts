import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { revalidateAllContent } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug, logo, websiteUrl, description, displayOrder, isActive } = await request.json();
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slugify(slug);
    if (logo !== undefined) updateData.logo = logo;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl;
    if (description !== undefined) updateData.description = description;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const brand = await prisma.brand.update({
      where: { id: params.id },
      data: updateData,
    });

    revalidateAllContent(['/admin/brands', `/brands/${brand.slug}`]);

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update brand' }, { status: 500 });
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
    await prisma.brand.delete({ where: { id: params.id } });

    revalidateAllContent(['/admin/brands']);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete brand' }, { status: 500 });
  }
}
