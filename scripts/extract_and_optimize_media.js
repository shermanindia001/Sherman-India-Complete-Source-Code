/**
 * scripts/extract_and_optimize_media.js
 * 
 * Safely extracts all 47 embedded Base64 Data URIs from the master backup
 * (scripts/original_production_backup_20261104.json), writes real binary image
 * files into public/images/optimized/, and generates a lightweight, production-ready
 * dataset (scripts/optimized_production_backup.json).
 * 
 * Pristine raw backup scripts/original_production_backup_20261104.json remains untouched.
 */

const fs = require('fs');
const path = require('path');

const RAW_BACKUP_PATH = path.resolve(__dirname, 'original_production_backup_20261104.json');
const OPTIMIZED_BACKUP_PATH = path.resolve(__dirname, 'optimized_production_backup.json');
const TARGET_DIR = path.resolve(__dirname, '..', 'public', 'images', 'optimized');

if (!fs.existsSync(RAW_BACKUP_PATH)) {
  console.error('Raw backup not found at:', RAW_BACKUP_PATH);
  process.exit(1);
}

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

console.log('========================================================================');
console.log('SHERMAN INTERNATIONAL — MEDIA EXTRACTION & PAYLOAD OPTIMIZATION');
console.log('Source Backup:', RAW_BACKUP_PATH);
console.log('Target Image Directory:', TARGET_DIR);
console.log('Optimized Backup Output:', OPTIMIZED_BACKUP_PATH);
console.log('========================================================================\n');

const rawData = JSON.parse(fs.readFileSync(RAW_BACKUP_PATH, 'utf8'));
const optimizedData = JSON.parse(JSON.stringify(rawData)); // Deep clone

let extractedCount = 0;
let totalSavedBytes = 0;
const extractedFiles = [];

function extractBase64(dataUri, suggestedName) {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) {
    return dataUri;
  }

  const match = dataUri.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/s);
  if (!match) {
    // If malformed or generic data uri
    console.warn(`[Warning] Unrecognized Data URI pattern for: ${suggestedName}`);
    return dataUri;
  }

  let ext = match[1].toLowerCase();
  if (ext === 'jpeg') ext = 'jpg';
  if (ext === 'svg+xml') ext = 'svg';

  const base64Data = match[2].trim();
  const buffer = Buffer.from(base64Data, 'base64');

  // Sanitize filename
  const cleanName = suggestedName.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const filename = `${cleanName}.${ext}`;
  const diskPath = path.join(TARGET_DIR, filename);

  fs.writeFileSync(diskPath, buffer);
  const relativeUrl = `/images/optimized/${filename}`;

  extractedCount++;
  totalSavedBytes += (dataUri.length - relativeUrl.length);
  extractedFiles.push({
    filename,
    size: buffer.length,
    originalLength: dataUri.length,
    url: relativeUrl
  });

  return relativeUrl;
}

// 1. ProductCategory
console.log('1. Processing ProductCategory images...');
for (const cat of optimizedData.tables.ProductCategory || []) {
  if (cat.image && cat.image.startsWith('data:')) {
    cat.image = extractBase64(cat.image, `category-${cat.slug || cat.id}`);
  }
  if (cat.icon && cat.icon.startsWith('data:')) {
    cat.icon = extractBase64(cat.icon, `category-icon-${cat.slug || cat.id}`);
  }
}

// 2. Brand
console.log('2. Processing Brand logos...');
for (const brand of optimizedData.tables.Brand || []) {
  if (brand.logo && brand.logo.startsWith('data:')) {
    brand.logo = extractBase64(brand.logo, `brand-${brand.slug || brand.id}`);
  }
}

// 3. Product
console.log('3. Processing Product images...');
for (const prod of optimizedData.tables.Product || []) {
  if (prod.image && prod.image.startsWith('data:')) {
    prod.image = extractBase64(prod.image, `product-${prod.slug || prod.id}`);
  }
  if (prod.additionalImages) {
    try {
      const arr = JSON.parse(prod.additionalImages);
      if (Array.isArray(arr)) {
        let changed = false;
        const newArr = arr.map((item, idx) => {
          if (typeof item === 'string' && item.startsWith('data:')) {
            changed = true;
            return extractBase64(item, `product-${prod.slug || prod.id}-add-${idx}`);
          }
          return item;
        });
        if (changed) {
          prod.additionalImages = JSON.stringify(newArr);
        }
      }
    } catch (e) {
      if (typeof prod.additionalImages === 'string' && prod.additionalImages.startsWith('data:')) {
        prod.additionalImages = extractBase64(prod.additionalImages, `product-${prod.slug || prod.id}-add`);
      }
    }
  }
}

// 4. Industry
console.log('4. Processing Industry images...');
for (const ind of optimizedData.tables.Industry || []) {
  if (ind.image && ind.image.startsWith('data:')) {
    ind.image = extractBase64(ind.image, `industry-${ind.slug || ind.id}`);
  }
  if (ind.icon && ind.icon.startsWith('data:')) {
    ind.icon = extractBase64(ind.icon, `industry-icon-${ind.slug || ind.id}`);
  }
}

// 5. Service
console.log('5. Processing Service images...');
for (const srv of optimizedData.tables.Service || []) {
  if (srv.image && srv.image.startsWith('data:')) {
    srv.image = extractBase64(srv.image, `service-${srv.slug || srv.id}`);
  }
  if (srv.icon && srv.icon.startsWith('data:')) {
    srv.icon = extractBase64(srv.icon, `service-icon-${srv.slug || srv.id}`);
  }
}

// 6. SiteContent
console.log('6. Processing SiteContent...');
for (const item of optimizedData.tables.SiteContent || []) {
  if (item.image && item.image.startsWith('data:')) {
    item.image = extractBase64(item.image, `content-${item.key}`);
  }
  // Check if content column has embedded JSON containing Base64 images (e.g. our_partners)
  if (item.content && item.content.includes('data:image/')) {
    try {
      const parsed = JSON.parse(item.content);
      if (Array.isArray(parsed)) {
        parsed.forEach((entry, idx) => {
          if (entry.logo && typeof entry.logo === 'string' && entry.logo.startsWith('data:')) {
            const name = entry.name ? entry.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : `entry-${idx}`;
            entry.logo = extractBase64(entry.logo, `partner-logo-${name}`);
          }
          if (entry.image && typeof entry.image === 'string' && entry.image.startsWith('data:')) {
            const name = entry.name ? entry.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : `entry-${idx}`;
            entry.image = extractBase64(entry.image, `partner-img-${name}`);
          }
        });
        item.content = JSON.stringify(parsed);
      }
    } catch (e) {
      // If not JSON, search with regex
      item.content = item.content.replace(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g, (match, offset) => {
        return extractBase64(match, `content-${item.key}-embedded-${offset}`);
      });
    }
  }
}

// 7. ProudlyServedClient
console.log('7. Processing ProudlyServedClient logos...');
for (const client of optimizedData.tables.ProudlyServedClient || []) {
  if (client.logo && client.logo.startsWith('data:')) {
    const safeName = client.name ? client.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : client.id;
    client.logo = extractBase64(client.logo, `client-${safeName}`);
  }
}

// 8. GalleryItem
console.log('8. Processing GalleryItem images...');
for (const item of optimizedData.tables.GalleryItem || []) {
  if (item.imageUrl && item.imageUrl.startsWith('data:')) {
    const safeTitle = item.title ? item.title.toLowerCase().replace(/[^a-z0-9]/g, '-') : item.id;
    item.imageUrl = extractBase64(item.imageUrl, `gallery-${safeTitle}`);
  }
}

// Update metadata in optimized output
optimizedData.metadata.optimizedAt = new Date().toISOString();
optimizedData.metadata.extractedMediaCount = extractedCount;
optimizedData.metadata.mediaDirectory = '/images/optimized/';

// Write optimized master backup
fs.writeFileSync(OPTIMIZED_BACKUP_PATH, JSON.stringify(optimizedData, null, 2), 'utf8');

// Write optimized table files in scripts/backup_optimized/
const optimizedDir = path.resolve(__dirname, 'backup_optimized');
if (!fs.existsSync(optimizedDir)) {
  fs.mkdirSync(optimizedDir, { recursive: true });
}

for (const [table, rows] of Object.entries(optimizedData.tables)) {
  fs.writeFileSync(path.join(optimizedDir, `${table}.json`), JSON.stringify(rows, null, 2), 'utf8');
}

const rawStat = fs.statSync(RAW_BACKUP_PATH);
const optStat = fs.statSync(OPTIMIZED_BACKUP_PATH);
const rawMb = (rawStat.size / (1024 * 1024)).toFixed(2);
const optMb = (optStat.size / 1024).toFixed(2);
const reductionPct = (((rawStat.size - optStat.size) / rawStat.size) * 100).toFixed(1);

console.log('\n========================================================================');
console.log('✓ MEDIA EXTRACTION & OPTIMIZATION COMPLETE!');
console.log(`Extracted Images: ${extractedCount} binary image files created`);
console.log(`Directory: ${TARGET_DIR}`);
console.log(`Raw Backup Size: ${rawMb} MB (${rawStat.size} bytes)`);
console.log(`Optimized Backup Size: ${optMb} KB (${optStat.size} bytes)`);
console.log(`Database Payload Reduction: ${reductionPct}%`);
console.log(`Total Database Bandwidth Saved: ${(totalSavedBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log('========================================================================\n');

