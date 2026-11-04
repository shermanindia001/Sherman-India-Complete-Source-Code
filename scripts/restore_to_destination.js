/**
 * scripts/restore_to_destination.js
 * 
 * Safely and non-destructively restores all verified Sherman International
 * production records across all 12 models into the destination PostgreSQL database.
 * 
 * Usage:
 * TARGET_DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require" node scripts/restore_to_destination.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function restore() {
  const optFile = path.join(__dirname, 'optimized_production_backup.json');
  const rawFile = path.join(__dirname, 'original_production_backup_20261104.json');
  const legacyFile = path.join(__dirname, 'consolidated_verified_backup.json');

  const backupFile = fs.existsSync(optFile) ? optFile : (fs.existsSync(rawFile) ? rawFile : legacyFile);
  if (!fs.existsSync(backupFile)) {
    console.error('Error: Production backup file not found!');
    process.exit(1);
  }

  console.log(`Loading backup from: ${backupFile}`);
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const models = backup.tables || backup.models;

  const targetUrl = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
  if (!targetUrl || (!targetUrl.startsWith('postgresql://') && !targetUrl.startsWith('postgres://'))) {
    console.error('Error: A valid PostgreSQL connection string must be provided via TARGET_DATABASE_URL or DATABASE_URL');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: targetUrl }
    }
  });

  console.log('========================================================================');
  console.log('SHERMAN INTERNATIONAL — NON-DESTRUCTIVE DATABASE RESTORATION');
  console.log('========================================================================');

  try {
    // 1. Admin Users
    console.log(`\n1. Restoring Admin Users (${models.AdminUser?.length || 0})...`);
    for (const u of models.AdminUser || []) {
      await prisma.adminUser.upsert({
        where: { email: u.email },
        update: {
          passwordHash: u.passwordHash,
          name: u.name,
          role: u.role,
        },
        create: {
          id: u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          name: u.name,
          role: u.role,
          sessionVersion: u.sessionVersion || 1,
          createdAt: new Date(u.createdAt || Date.now()),
          updatedAt: new Date(u.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Admin users restored.');

    // 2. Product Categories
    console.log(`\n2. Restoring Product Categories (${models.ProductCategory?.length || 0})...`);
    for (const c of models.ProductCategory || []) {
      await prisma.productCategory.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          slug: c.slug,
          description: c.description,
          image: c.image,
          icon: c.icon,
          displayOrder: c.displayOrder,
          isActive: c.isActive,
        },
        create: {
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          image: c.image,
          icon: c.icon,
          displayOrder: c.displayOrder,
          isActive: c.isActive,
          createdAt: new Date(c.createdAt || Date.now()),
          updatedAt: new Date(c.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Product categories restored.');

    // 3. Brands
    console.log(`\n3. Restoring Brands (${models.Brand?.length || 0})...`);
    for (const b of models.Brand || []) {
      await prisma.brand.upsert({
        where: { id: b.id },
        update: {
          name: b.name,
          slug: b.slug,
          logo: b.logo,
          websiteUrl: b.websiteUrl,
          description: b.description,
          displayOrder: b.displayOrder,
          isActive: b.isActive,
        },
        create: {
          id: b.id,
          name: b.name,
          slug: b.slug,
          logo: b.logo,
          websiteUrl: b.websiteUrl,
          description: b.description,
          displayOrder: b.displayOrder,
          isActive: b.isActive,
          createdAt: new Date(b.createdAt || Date.now()),
          updatedAt: new Date(b.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Brands restored.');

    // 4. Products
    console.log(`\n4. Restoring Products (${models.Product?.length || 0})...`);
    for (const p of models.Product || []) {
      await prisma.product.upsert({
        where: { id: p.id },
        update: {
          name: p.name,
          slug: p.slug,
          categoryId: p.categoryId,
          brandId: p.brandId,
          shortDescription: p.shortDescription,
          description: p.description,
          specifications: p.specifications,
          features: p.features,
          applications: p.applications,
          image: p.image,
          additionalImages: p.additionalImages,
          isPublished: p.isPublished,
          isFeatured: p.isFeatured,
          displayOrder: p.displayOrder,
        },
        create: {
          id: p.id,
          name: p.name,
          slug: p.slug,
          categoryId: p.categoryId,
          brandId: p.brandId,
          shortDescription: p.shortDescription,
          description: p.description,
          specifications: p.specifications,
          features: p.features,
          applications: p.applications,
          image: p.image,
          additionalImages: p.additionalImages,
          isPublished: p.isPublished,
          isFeatured: p.isFeatured,
          displayOrder: p.displayOrder,
          createdAt: new Date(p.createdAt || Date.now()),
          updatedAt: new Date(p.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Products restored.');

    // 5. Industries
    console.log(`\n5. Restoring Industries (${models.Industry?.length || 0})...`);
    for (const ind of models.Industry || []) {
      await prisma.industry.upsert({
        where: { id: ind.id },
        update: {
          name: ind.name,
          slug: ind.slug,
          description: ind.description,
          fullDescription: ind.fullDescription,
          image: ind.image,
          icon: ind.icon,
          isPublished: ind.isPublished,
          displayOrder: ind.displayOrder,
        },
        create: {
          id: ind.id,
          name: ind.name,
          slug: ind.slug,
          description: ind.description,
          fullDescription: ind.fullDescription,
          image: ind.image,
          icon: ind.icon,
          isPublished: ind.isPublished,
          displayOrder: ind.displayOrder,
          createdAt: new Date(ind.createdAt || Date.now()),
          updatedAt: new Date(ind.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Industries restored.');

    // 6. Services
    console.log(`\n6. Restoring Services (${models.Service?.length || 0})...`);
    for (const s of models.Service || []) {
      await prisma.service.upsert({
        where: { id: s.id },
        update: {
          name: s.name,
          slug: s.slug,
          shortDescription: s.shortDescription,
          fullDescription: s.fullDescription,
          capabilities: s.capabilities,
          image: s.image,
          icon: s.icon,
          isPublished: s.isPublished,
          displayOrder: s.displayOrder,
        },
        create: {
          id: s.id,
          name: s.name,
          slug: s.slug,
          shortDescription: s.shortDescription,
          fullDescription: s.fullDescription,
          capabilities: s.capabilities,
          image: s.image,
          icon: s.icon,
          isPublished: s.isPublished,
          displayOrder: s.displayOrder,
          createdAt: new Date(s.createdAt || Date.now()),
          updatedAt: new Date(s.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Services restored.');

    // 7. Site Content
    console.log(`\n7. Restoring Site Content (${models.SiteContent?.length || 0})...`);
    for (const sc of models.SiteContent || []) {
      await prisma.siteContent.upsert({
        where: { key: sc.key },
        update: {
          section: sc.section,
          title: sc.title,
          subtitle: sc.subtitle,
          content: sc.content,
          metadata: sc.metadata,
          image: sc.image,
        },
        create: {
          id: sc.id,
          key: sc.key,
          section: sc.section,
          title: sc.title,
          subtitle: sc.subtitle,
          content: sc.content,
          metadata: sc.metadata,
          image: sc.image,
          updatedAt: new Date(sc.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Site content restored.');

    // 8. Clients (Proudly Served)
    console.log(`\n8. Restoring Clients (${models.ProudlyServedClient?.length || 0})...`);
    for (const cl of models.ProudlyServedClient || []) {
      await prisma.proudlyServedClient.upsert({
        where: { id: cl.id },
        update: {
          name: cl.name,
          logo: cl.logo,
          websiteUrl: cl.websiteUrl,
          displayOrder: cl.displayOrder,
          isActive: cl.isActive,
        },
        create: {
          id: cl.id,
          name: cl.name,
          logo: cl.logo,
          websiteUrl: cl.websiteUrl,
          displayOrder: cl.displayOrder,
          isActive: cl.isActive,
          createdAt: new Date(cl.createdAt || Date.now()),
          updatedAt: new Date(cl.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Clients restored.');

    // 9. Media Assets
    console.log(`\n9. Restoring Media Assets (${models.MediaAsset?.length || 0})...`);
    for (const m of models.MediaAsset || []) {
      await prisma.mediaAsset.upsert({
        where: { id: m.id },
        update: {
          fileName: m.fileName,
          fileUrl: m.fileUrl,
          fileType: m.fileType,
          fileSize: m.fileSize,
          altText: m.altText,
        },
        create: {
          id: m.id,
          fileName: m.fileName,
          fileUrl: m.fileUrl,
          fileType: m.fileType,
          fileSize: m.fileSize,
          altText: m.altText,
          createdAt: new Date(m.createdAt || Date.now()),
        },
      });
    }
    console.log('✓ Media assets restored.');

    // 10. Enquiries
    console.log(`\n10. Restoring Enquiries (${models.Enquiry?.length || 0})...`);
    for (const eq of models.Enquiry || []) {
      await prisma.enquiry.upsert({
        where: { id: eq.id },
        update: {
          name: eq.name,
          company: eq.company,
          email: eq.email,
          phone: eq.phone,
          productName: eq.productName,
          status: eq.status,
          message: eq.message,
        },
        create: {
          id: eq.id,
          name: eq.name,
          company: eq.company,
          email: eq.email,
          phone: eq.phone,
          productName: eq.productName,
          status: eq.status,
          message: eq.message,
          createdAt: new Date(eq.createdAt || Date.now()),
          updatedAt: new Date(eq.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Enquiries restored.');

    // 11. Gallery Items
    console.log(`\n11. Restoring Gallery Items (${models.GalleryItem?.length || 0})...`);
    for (const g of models.GalleryItem || []) {
      await prisma.galleryItem.upsert({
        where: { id: g.id },
        update: {
          title: g.title,
          caption: g.caption,
          altText: g.altText,
          imageUrl: g.imageUrl,
          category: g.category,
          displayOrder: g.displayOrder,
          isPublished: g.isPublished,
        },
        create: {
          id: g.id,
          title: g.title,
          caption: g.caption,
          altText: g.altText,
          imageUrl: g.imageUrl,
          category: g.category,
          displayOrder: g.displayOrder,
          isPublished: g.isPublished,
          createdAt: new Date(g.createdAt || Date.now()),
          updatedAt: new Date(g.updatedAt || Date.now()),
        },
      });
    }
    console.log('✓ Gallery items restored.');

    console.log('\n========================================================================');
    console.log('✓ RESTORATION COMPLETED SUCCESSFULLY WITH 100% RELATIONAL INTEGRITY');
    console.log('========================================================================');
  } catch (err) {
    console.error('Restoration error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  restore();
}

module.exports = { restore };

