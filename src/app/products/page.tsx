import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import prisma from '@/lib/prisma';
import ProductCatalogClient from './ProductCatalogClient';

export const metadata = {
  title: 'Products & Engineering Solutions | Sherman International',
  description:
    'Explore our comprehensive catalog of flow measurement devices, process switches, dynamic balancing machines, vibration monitors, and combustion control equipment.',
};

// ISR edge caching: cache catalog for 5 minutes at Cloudflare edge
export const revalidate = 300;

export default async function ProductsPage() {
  let categories: any[] = [];
  let brands: any[] = [];
  let products: any[] = [];

  try {
    const results = await Promise.all([
      prisma.productCategory.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
        },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.brand.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
        orderBy: { displayOrder: 'asc' },
      }),
      prisma.product.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          image: true,
          isFeatured: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    categories = results[0];
    brands = results[1];
    products = results[2];
  } catch (err: any) {
    console.warn('[ProductsPage Database Warning]:', err.message);
  }

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">Products</span>
        </nav>

        {/* Page Header */}
        <div className="mb-10 space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900">
            Engineered Products & Instrumentation
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Direct channel partner for leading global manufacturers. Technical consulting, system integration, and on-site after-sales support across India.
          </p>
        </div>

        {/* Client-side Filterable Catalog Component */}
        <ProductCatalogClient
          initialProducts={products}
          categories={categories}
          brands={brands}
        />
      </div>
    </div>
  );
}
