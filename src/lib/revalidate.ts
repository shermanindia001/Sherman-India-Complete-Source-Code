import { revalidatePath } from 'next/cache';

/**
 * Sherman International — Centralized Cache Revalidation Helper
 * Ensures all public and admin pages, layouts, and navigation mega-menus
 * are immediately purged from stale cache upon any create, update, or delete operation.
 */
export function revalidateAllContent(extraPaths: string[] = []) {
  const corePaths = [
    { path: '/', type: 'layout' as const },
    { path: '/', type: 'page' as const },
    { path: '/products', type: 'page' as const },
    { path: '/brands', type: 'page' as const },
    { path: '/industries', type: 'page' as const },
    { path: '/services', type: 'page' as const },
    { path: '/gallery', type: 'page' as const },
    { path: '/our-partners', type: 'page' as const },
    { path: '/contact', type: 'page' as const },
  ];

  for (const item of corePaths) {
    try {
      revalidatePath(item.path, item.type);
    } catch (e) {
      // Non-blocking in non-Next runtime
    }
  }

  for (const path of extraPaths) {
    try {
      revalidatePath(path);
      revalidatePath(path, 'page');
    } catch (e) {}
  }
}

