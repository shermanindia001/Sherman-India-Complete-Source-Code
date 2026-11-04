import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';
import { normalizeWebsiteContent, parseContentValue } from '@/lib/content';
import { sanitizeHtml } from '@/lib/sanitize';

export async function GET() {
  try {
    const rawContents = await prisma.siteContent.findMany();
    const normalized = normalizeWebsiteContent(rawContents);
    const res = NextResponse.json({
      contents: rawContents,
      normalized,
    });
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res;
  } catch (error) {
    console.error('Failed to fetch site content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { key, section, title, subtitle, content, metadata, image } = body;

    if (!key) {
      return NextResponse.json({ error: 'Section key is required' }, { status: 400 });
    }

    // Fetch existing record to merge partial updates safely
    const existing = await prisma.siteContent.findUnique({ where: { key } });
    const existingMeta = parseContentValue(existing?.metadata) || {};
    const existingContentParsed = parseContentValue(existing?.content);

    let finalContent = content !== undefined ? content : existing?.content;
    let finalMetadata = metadata !== undefined ? metadata : existingMeta;

    // Handle special sections with structured objects
    if (key === 'vision_mission') {
      const vision =
        body.vision !== undefined
          ? body.vision
          : existingContentParsed?.vision || existing?.content || '';
      const mission =
        body.mission !== undefined
          ? body.mission
          : existingContentParsed?.mission || '';

      const visionEyebrow = body.visionEyebrow ?? existingMeta?.visionEyebrow ?? 'Guiding Principle';
      const visionTitle = body.visionTitle ?? existingMeta?.visionTitle ?? 'Our Vision';
      const missionEyebrow = body.missionEyebrow ?? existingMeta?.missionEyebrow ?? 'Core Commitment';
      const missionTitle = body.missionTitle ?? existingMeta?.missionTitle ?? 'Our Mission';

      finalContent = JSON.stringify({
        vision: typeof vision === 'string' ? sanitizeHtml(vision.trim()) : vision,
        mission: typeof mission === 'string' ? sanitizeHtml(mission.trim()) : mission,
      });

      finalMetadata = JSON.stringify({
        ...existingMeta,
        visionEyebrow,
        visionTitle,
        missionEyebrow,
        missionTitle,
      });
    } else if (key === 'about_hero') {
      const lead = body.lead ?? body.content ?? existingMeta?.lead ?? '';
      finalContent = typeof lead === 'string' ? sanitizeHtml(lead.trim()) : lead;
      finalMetadata = JSON.stringify({
        ...existingMeta,
        lead: finalContent,
      });
    } else if (key === 'contact_info') {
      const company =
        body.company !== undefined
          ? body.company
          : existingContentParsed?.company || 'Sherman International (P) Limited';
      const description =
        body.description !== undefined
          ? body.description
          : existingContentParsed?.description || undefined;
      const address =
        body.address !== undefined
          ? body.address
          : existingContentParsed?.address || existing?.content || '';
      const phone =
        body.phone !== undefined
          ? body.phone
          : existingContentParsed?.phone || '+91 90151 22200';
      const phoneSecondary =
        body.phoneSecondary !== undefined
          ? body.phoneSecondary
          : existingContentParsed?.phoneSecondary || '+91 90151 22200';
      const email =
        body.email !== undefined
          ? body.email
          : existingContentParsed?.email || 'admin@sherman-india.com';
      const enquiryEmail =
        body.enquiryEmail !== undefined
          ? body.enquiryEmail
          : existingContentParsed?.enquiryEmail || email;
      const technicalSupportEmail =
        body.technicalSupportEmail !== undefined
          ? body.technicalSupportEmail
          : existingContentParsed?.technicalSupportEmail || null;
      const workingHours =
        body.workingHours !== undefined
          ? body.workingHours
          : existingContentParsed?.workingHours || 'Monday to Friday: 9:30 AM – 6:00 PM IST';
      const whatsapp =
        body.whatsapp !== undefined
          ? body.whatsapp
          : existingContentParsed?.whatsapp || '+919015122200';
      const googleMapsUrl =
        body.googleMapsUrl !== undefined
          ? body.googleMapsUrl
          : existingContentParsed?.googleMapsUrl || '';

      finalContent = JSON.stringify({
        company,
        description,
        address,
        phone,
        phoneSecondary,
        email: enquiryEmail,
        enquiryEmail,
        technicalSupportEmail,
        workingHours,
        whatsapp,
        googleMapsUrl,
      });
    } else if (key === 'about_stats') {
      const badge = body.badge !== undefined ? body.badge : existingContentParsed?.badge || 'Some Cool Facts';
      const heading = body.heading !== undefined ? body.heading : body.title || existing?.title || 'Numbers Speak for Themselves';
      const intro = body.intro !== undefined ? body.intro : body.content || existing?.content || 'A quantifiable proven track record built on precision engineering, long-term industrial partnerships, and relentless execution quality.';
      const items = body.items !== undefined ? body.items : existingMeta?.items || [];

      finalContent = typeof intro === 'string' ? intro : JSON.stringify(intro);
      finalMetadata = JSON.stringify({
        badge,
        heading,
        items: Array.isArray(items) ? items : [],
      });
    } else if (typeof finalContent === 'object' && finalContent !== null) {
      finalContent = JSON.stringify(finalContent);
    } else if (typeof finalContent === 'string') {
      finalContent = sanitizeHtml(finalContent);
    }

    const payload = {
      section: section || existing?.section || 'general',
      title: title !== undefined ? title : existing?.title,
      subtitle: subtitle !== undefined ? subtitle : existing?.subtitle,
      content: finalContent,
      metadata:
        typeof finalMetadata === 'string'
          ? finalMetadata
          : JSON.stringify(finalMetadata || {}),
      image: image !== undefined ? image : existing?.image,
    };

    const siteContent = await prisma.siteContent.upsert({
      where: { key },
      update: payload,
      create: {
        key,
        ...payload,
      },
    });

    // Invalidate stale caches immediately across public and admin pages
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/');
      revalidatePath('/about');
      revalidatePath('/contact');
      revalidatePath('/admin/content');
    } catch (e) {
      console.warn('Revalidation notice:', e);
    }

    return NextResponse.json({ success: true, siteContent });
  } catch (error: any) {
    console.error('Failed to save content:', error);
    return NextResponse.json({ error: error.message || 'Failed to save content' }, { status: 500 });
  }
}
