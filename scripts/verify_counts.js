const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function countAll() {
  const [
    adminUsers,
    categories,
    brands,
    products,
    industries,
    services,
    siteContent,
    enquiries,
    mediaAssets,
    clients,
    galleryItems,
    tokens
  ] = await Promise.all([
    prisma.adminUser.count(),
    prisma.productCategory.count(),
    prisma.brand.count(),
    prisma.product.count(),
    prisma.industry.count(),
    prisma.service.count(),
    prisma.siteContent.count(),
    prisma.enquiry.count(),
    prisma.mediaAsset.count(),
    prisma.proudlyServedClient.count(),
    prisma.galleryItem.count(),
    prisma.passwordResetToken.count()
  ]);

  const total = adminUsers + categories + brands + products + industries + services + siteContent + enquiries + mediaAssets + clients + galleryItems + tokens;
  console.log('--- VERIFIED LIVE POSTGRES ROW COUNTS ---');
  console.log('AdminUser:', adminUsers);
  console.log('ProductCategory:', categories);
  console.log('Brand:', brands);
  console.log('Product:', products);
  console.log('Industry:', industries);
  console.log('Service:', services);
  console.log('SiteContent:', siteContent);
  console.log('Enquiry:', enquiries);
  console.log('MediaAsset:', mediaAssets);
  console.log('ProudlyServedClient:', clients);
  console.log('GalleryItem:', galleryItems);
  console.log('PasswordResetToken:', tokens);
  console.log('TOTAL VERIFIED RECORDS:', total);
  await prisma.$disconnect();
}

countAll().catch(e => {
  console.error(e);
  process.exit(1);
});

