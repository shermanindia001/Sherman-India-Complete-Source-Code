import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth';
import { getAuthenticationParameters } from '@/lib/imagekit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authParams = getAuthenticationParameters();
    return NextResponse.json({
      token: authParams.token,
      expire: authParams.expire,
      signature: authParams.signature,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    });
  } catch (error: any) {
    console.error('[ImageKit Auth API Error]:', error);
    return NextResponse.json({ error: error.message || 'Authentication generation failed' }, { status: 500 });
  }
}

