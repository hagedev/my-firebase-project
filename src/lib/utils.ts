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
 * Handles Google Photos URLs to make them usable in `next/image`.
 * Primarily deals with direct `lh3.googleusercontent.com` links.
 * @param url The public Google Photos URL.
 * @returns A direct image link usable in <img> src, or the original URL if no conversion is needed.
 */
export function convertGoogleImageUrl(url: string): string {
  // If the user correctly copies the "Image Address", the URL will be from googleusercontent.com
  if (url.includes('lh3.googleusercontent.com')) {
    // The URL might have resizing parameters like "=w1920-h1080-no".
    // Splitting by '=' and taking the first part gets the base URL for the original image.
    return url.split('=')[0];
  }

  // If the user copies the browser's address bar link (photos.app.goo.gl),
  // it's a link to a web page, not a direct image. Next/Image cannot use it.
  // We return it as is but warn the developer.
  if (url.includes('photos.app.goo.gl')) {
    console.warn(
      `Invalid URL format: "${url}". This is a webpage link, not a direct image link. ` +
      `Please right-click the image in Google Photos and select "Copy Image Address" ` +
      `to get a '...googleusercontent.com' link.`
    );
    // Returning the original URL will likely cause a "hostname not configured" error, which is informative.
    return url;
  }
  
  // For any other URL, return it as is.
  return url;
}
