/**
 * Sherman International — Secure Server-Side ImageKit Integration
 *
 * Implements persistent media storage via ImageKit Free tier:
 * - Server-side only (private key NEVER exposed to browser)
 * - File validation: type, MIME type, extension, size
 * - Dangerous/executable file rejection
 * - Image & PDF upload, retrieval, and deletion
 * - Rate limit & error handling
 * - Authentication parameter generator for direct client uploads
 */

import crypto from 'crypto';

export interface ImageKitUploadOptions {
  file: Buffer | Uint8Array | string; // Buffer, Uint8Array or Base64 string
  fileName: string;
  folder?: string;
  tags?: string[];
  isPrivateFile?: boolean;
  customCoordinates?: string;
  responseFields?: string[];
}

export interface ImageKitUploadResult {
  fileId: string;
  name: string;
  size: number;
  versionInfo: { id: string; name: string };
  filePath: string;
  url: string;
  fileType: string;
  height?: number;
  width?: number;
  thumbnailUrl?: string;
}

export interface ImageKitAuthParams {
  token: string;
  expire: number;
  signature: string;
}

function getImageKitConfig() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error(
      'ImageKit credentials missing. Ensure IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT are configured.'
    );
  }

  return {
    publicKey: publicKey.trim(),
    privateKey: privateKey.trim(),
    urlEndpoint: urlEndpoint.trim().replace(/\/+$/, ''),
  };
}

/**
 * Validates file safety: checks against dangerous/executable extensions & MIME types.
 */
export function validateMediaFile(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  const DANGEROUS_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'sh', 'php', 'py', 'pl', 'jsp', 'asp', 'aspx', 'cgi',
    'js', 'mjs', 'ts', 'vbs', 'jar', 'war', 'msi', 'com', 'scr', 'hta', 'ps1'
  ];

  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'avif', 'pdf'];
  const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/svg+xml',
    'image/gif',
    'image/avif',
    'application/pdf',
  ];

  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Dangerous executable file type (.${ext}) is prohibited.` };
  }

  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Unsupported format (.${ext}). Allowed formats: JPG, JPEG, PNG, WEBP, SVG, GIF, PDF.`,
    };
  }

  const MAX_SIZE_MB = 15;
  if (sizeBytes > MAX_SIZE_MB * 1024 * 1024) {
    return {
      valid: false,
      error: `File size exceeds the ${MAX_SIZE_MB}MB limit.`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a file to ImageKit using official REST API
 */
export async function uploadToImageKit(
  options: ImageKitUploadOptions
): Promise<ImageKitUploadResult> {
  const { privateKey } = getImageKitConfig();

  let base64File: string;
  if (typeof options.file === 'string') {
    base64File = options.file;
  } else {
    base64File = Buffer.from(options.file).toString('base64');
  }

  // Sanitize unique file name
  const cleanName = options.fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');
  const safeFileName = `${Date.now()}-${cleanName}`;
  const targetFolder = (options.folder || '/general').replace(/[^a-z0-9/_-]/gi, '');

  const formData = new URLSearchParams();
  formData.append('file', base64File);
  formData.append('fileName', safeFileName);
  formData.append('folder', targetFolder.startsWith('/') ? targetFolder : `/${targetFolder}`);
  formData.append('useUniqueFileName', 'true');

  if (options.tags && options.tags.length > 0) {
    formData.append('tags', options.tags.join(','));
  }
  if (options.isPrivateFile) {
    formData.append('isPrivateFile', 'true');
  }

  const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const responseData = await response.json();

  if (!response.ok) {
    const errorMsg =
      responseData?.message || responseData?.help || `ImageKit upload failed with HTTP status ${response.status}`;
    console.error('[ImageKit Upload Error]:', responseData);
    throw new Error(errorMsg);
  }

  return {
    fileId: responseData.fileId,
    name: responseData.name,
    size: responseData.size,
    versionInfo: responseData.versionInfo || { id: '', name: '' },
    filePath: responseData.filePath,
    url: responseData.url,
    fileType: responseData.fileType,
    height: responseData.height,
    width: responseData.width,
    thumbnailUrl: responseData.thumbnailUrl,
  };
}

/**
 * Retrieves file details from ImageKit
 */
export async function getImageKitFileDetails(fileId: string): Promise<any> {
  const { privateKey } = getImageKitConfig();
  const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');

  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}/details`, {
    method: 'GET',
    headers: { Authorization: authHeader },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to retrieve ImageKit file details: ${response.status}`);
  }

  return response.json();
}

/**
 * Deletes a file from ImageKit
 */
export async function deleteFromImageKit(fileId: string): Promise<boolean> {
  if (!fileId) return false;
  const { privateKey } = getImageKitConfig();
  const authHeader = 'Basic ' + Buffer.from(privateKey + ':').toString('base64');

  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: authHeader },
  });

  if (response.status === 204 || response.status === 200) {
    return true;
  }

  if (response.status === 404) {
    // Already deleted
    return true;
  }

  const err = await response.json().catch(() => ({}));
  console.warn(`[ImageKit Delete Warning]: File ${fileId} deletion returned ${response.status}:`, err);
  return false;
}

/**
 * Generates client-side upload authentication parameters.
 * Only the public key and HMAC-SHA1 signature are returned — private key is never exposed.
 */
export function getAuthenticationParameters(): ImageKitAuthParams {
  const { privateKey } = getImageKitConfig();
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 1800; // 30 minutes

  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');

  return { token, expire, signature };
}

