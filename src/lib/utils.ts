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
 * Validates a URL for use in next/image. It returns the URL if it's from an allowed hostname,
 * otherwise returns an empty string to prevent crashes.
 * @param url The URL to validate.
 * @returns The original URL if valid, or an empty string.
 */
export function getValidImageUrl(url: string | undefined | null): string {
  if (!url) {
    return '';
  }

  try {
    const urlObject = new URL(url);
    
    // Explicitly block invalid Google Photos page links
    if (urlObject.hostname === 'photos.app.goo.gl') {
      console.warn(
        `Invalid URL format: "${url}". This is a webpage link, not a direct image link. ` +
        `Please right-click the image in Google Photos and select "Copy Image Address" ` +
        `to get a '...googleusercontent.com' link.`
      );
      return '';
    }

    // For any other URL, we let Next.js handle it. If the hostname is not configured
    // in next.config.js, Next.js will throw an error, which is informative.
    // The previous implementation was too restrictive.
    return url;
    
  } catch (error) {
    // If the URL is malformed and the URL constructor fails.
    console.error(`Invalid URL string provided: ${url}`);
    return '';
  }
}

/**
 * DEPRECATED: This function is confusing. Use getValidImageUrl for a safer approach.
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
