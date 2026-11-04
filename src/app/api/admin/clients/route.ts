import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { revalidateAllContent } from '@/lib/revalidate';

export async function GET() {
  try {
    const clients = await prisma.proudlyServedClient.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    return NextResponse.json(clients);
  } catch (error: any) {
    console.error('Error fetching proudly served clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, logo, websiteUrl, displayOrder, isActive } = body;

    if (!name || !logo) {
      return NextResponse.json(
        { error: 'Brand/Company name and Logo are required' },
        { status: 400 }
      );
    }

    const maxOrderClient = await prisma.proudlyServedClient.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });
    const nextOrder = displayOrder !== undefined ? Number(displayOrder) : (maxOrderClient?.displayOrder || 0) + 1;

    const newClient = await prisma.proudlyServedClient.create({
      data: {
        name: name.trim(),
        logo: logo.trim(),
        websiteUrl: websiteUrl ? websiteUrl.trim() : null,
        displayOrder: nextOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    revalidateAllContent(['/admin/clients']);

    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error('Error creating proudly served client:', error);
    return NextResponse.json({ error: 'Failed to create client logo' }, { status: 500 });
  }
}
