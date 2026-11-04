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
    const { name, slug, description, fullDescription, image, icon, displayOrder, isPublished } = await request.json();
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slugify(slug);
    if (description !== undefined) updateData.description = description;
    if (fullDescription !== undefined) updateData.fullDescription = fullDescription;
    if (image !== undefined) updateData.image = image;
    if (icon !== undefined) updateData.icon = icon;
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder);
    if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);

    const industry = await prisma.industry.update({
      where: { id: params.id },
      data: updateData,
    });

    revalidateAllContent(['/admin/industries', `/industries/${industry.slug}`]);

    return NextResponse.json({ success: true, industry });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update industry' }, { status: 500 });
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
    await prisma.industry.delete({ where: { id: params.id } });

    revalidateAllContent(['/admin/industries']);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete industry' }, { status: 500 });
  }
}
