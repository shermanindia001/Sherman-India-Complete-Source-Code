import React from 'react';
import prisma from '@/lib/prisma';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import ServicesSection from '@/components/ServicesSection';
import IndustriesSection from '@/components/IndustriesSection';
import WeProudlyServeCarousel from '@/components/WeProudlyServeCarousel';
import WhyShermanSection from '@/components/WhyShermanSection';
import EnquiryCtaBanner from '@/components/EnquiryCtaBanner';
import { normalizeHeroContent, normalizeAboutContent } from '@/lib/content';

// ISR edge caching: cache homepage for 5 minutes at Cloudflare edge to safeguard free-tier Neon compute
export const revalidate = 300;

export default async function HomePage() {
  let heroRecord: any = null;
  let aboutRecord: any = null;
  let services: any[] = [];
  let industries: any[] = [];
  let proudlyServedClients: any[] = [];

  try {
    // Fetch dynamic content and entities with lean, optimized projections
    const results = await Promise.all([
      prisma.siteContent.findUnique({
        where: { key: 'hero_section' },
        select: { key: true, title: true, subtitle: true, content: true, image: true },
      }),
      prisma.siteContent.findFirst({
        where: { key: { in: ['about_company', 'about_overview'] } },
        select: { key: true, title: true, subtitle: true, content: true, image: true },
      }),
      prisma.service.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          image: true,
          displayOrder: true,
        },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.industry.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          image: true,
          displayOrder: true,
        },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.proudlyServedClient.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          logo: true,
          websiteUrl: true,
          displayOrder: true,
        },
        orderBy: { displayOrder: 'asc' },
      }),
    ]);

    heroRecord = results[0];
    aboutRecord = results[1];
    services = results[2];
    industries = results[3];
    proudlyServedClients = results[4];
  } catch (err: any) {
    console.warn('[HomePage Database Warning]:', err.message);
  }

  const heroContent = normalizeHeroContent(heroRecord);
  const aboutContent = normalizeAboutContent(aboutRecord);

  return (
    <div className="flex flex-col">
      {/* 1. HERO SECTION */}
      <HeroSection
        title={heroContent.title}
        subtitle={heroContent.subtitle}
        content={heroContent.content}
        image={heroContent.image}
      />

      {/* 2. ABOUT SHERMAN */}
      <AboutSection
        title={aboutContent.title}
        subtitle={aboutContent.subtitle}
        content={aboutContent.content}
      />

      {/* 3. SERVICES */}
      <ServicesSection services={services} />

      {/* 4. INDUSTRIES */}
      <IndustriesSection industries={industries} />

      {/* 5. WE PROUDLY SERVE - CLIENT LOGOS CAROUSEL */}
      <WeProudlyServeCarousel clients={proudlyServedClients} />

      {/* 6. WHY SHERMAN / TRUST SECTION */}
      <WhyShermanSection />

      {/* 7. ENQUIRY CTA BANNER */}
      <EnquiryCtaBanner />
    </div>
  );
}
