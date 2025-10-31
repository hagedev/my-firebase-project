import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('IDR', 'Rp');
}

/**
 * Converts a public Google Drive sharing URL into a direct image link
 * that can be used by next/image.
 * @param url The public Google Drive sharing URL.
 * @returns The direct image URL or the original URL if it's not a Google Drive link.
 */
export function convertGoogleDriveUrl(url: string | undefined | null): string {
  if (!url) {
    return '';
  }

  // Check if it's a Google Drive URL
  if (url.includes('drive.google.com/file/d/')) {
    const fileId = url.split('/d/')[1].split('/')[0];
    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }
  
  // Return the original URL if it's not a convertible Google Drive link
  return url;
}

/**
 * Checks if a URL is a valid, accessible image by trying to fetch it.
 * This is useful for validating image URLs on the client-side before rendering.
 * @param url The URL to validate.
 * @returns A promise that resolves to true if the image is valid, false otherwise.
 */
export async function isValidUrl(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    // no-cors will result in an opaque response, but it's enough to know the URL is reachable.
    // The type 'opaque' indicates a successful cross-origin request in no-cors mode.
    return response.type === 'opaque' || (response.ok && (response.headers.get('Content-Type')?.startsWith('image/') ?? false));
  } catch (error) {
    // Network errors or other issues will be caught here
    console.error('Image validation error:', error);
    return false;
  }
}
