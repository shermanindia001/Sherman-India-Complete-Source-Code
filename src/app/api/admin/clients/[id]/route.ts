import { NextRequest, NextResponse } from 'next/server';
import { revalidateAllContent } from '@/lib/revalidate';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.proudlyServedClient.findUnique({
      where: { id: params.id },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json(client);
  } catch (error: any) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
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
    const { name, logo, websiteUrl, displayOrder, isActive } = body;

    const updated = await prisma.proudlyServedClient.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(logo !== undefined && { logo: logo.trim() }),
        ...(websiteUrl !== undefined && { websiteUrl: websiteUrl ? websiteUrl.trim() : null }),
        ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    revalidateAllContent(['/admin/clients']);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
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

    await prisma.proudlyServedClient.delete({
      where: { id: params.id },
    });

    revalidateAllContent(['/admin/clients']);

    return NextResponse.json({ success: true, message: 'Client deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
