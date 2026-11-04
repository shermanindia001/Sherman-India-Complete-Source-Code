import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { revalidateAllContent } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const industries = await prisma.industry.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    const res = NextResponse.json({ industries });
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res;
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch industries' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, slug, description, fullDescription, image, icon, displayOrder, isPublished } = await request.json();
    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    const industry = await prisma.industry.create({
      data: {
        name,
        slug: slug ? slugify(slug) : slugify(name),
        description,
        fullDescription: fullDescription || null,
        image: image || null,
        icon: icon || null,
        displayOrder: displayOrder ? parseInt(displayOrder) : 0,
        isPublished: isPublished ?? true,
      },
    });

    revalidateAllContent(['/admin/industries']);

    return NextResponse.json({ success: true, industry }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating industry:', error);
    return NextResponse.json(
      { error: error.code === 'P2002' ? 'Industry slug already exists' : 'Failed to create industry' },
      { status: 500 }
    );
  }
}
