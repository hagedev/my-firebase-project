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
 * DEPRECATED: This function is confusing. Use convertGoogleDriveUrl for a safer approach.
 * Handles Google Photos URLs to make them usable in `next/image`.
 * @param url The public Google Photos URL.
 * @returns A direct image link usable in <img> src, or the original URL if no conversion is needed.
 */
export function convertGoogleImageUrl(url: string): string {
  if (url.includes('lh3.googleusercontent.com')) {
    return url.split('=')[0];
  }
  if (url.includes('photos.app.goo.gl')) {
    console.warn(
      `Invalid URL format: "${url}". This is a webpage link, not a direct image link. ` +
      `Please right-click the image in Google Photos and select "Copy Image Address" ` +
      `to get a '...googleusercontent.com' link.`
    );
  }
  return url;
}
