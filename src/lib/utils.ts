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
 * Converts a public Google Photos URL to a direct image link.
 * For this to work, the user should "Copy Image Address" from a Google Photo.
 * The resulting URL usually starts with lh3.googleusercontent.com.
 * This function handles both direct links and potentially shared links if possible.
 * @param url The public Google Photos URL.
 * @returns A direct image link usable in <img> src, or the original URL if no conversion is needed.
 */
export function convertGoogleImageUrl(url: string): string {
  if (url.includes('lh3.googleusercontent.com')) {
    // It's already a direct link, but we can remove resizing parameters to get the original.
    return url.split('=')[0];
  }

  // Basic check for a common shared link format. This is less reliable.
  const G_PHOTOS_REGEX = /https?:\/\/photos\.app\.goo\.gl\/([a-zA-Z0-9_-]+)/;
  const match = url.match(G_PHOTOS_REGEX);
  
  // This conversion is not straightforward and generally not reliable for API use.
  // We advise users to copy the direct image address. The function will primarily handle already direct links.
  if (match) {
    // In a real-world scenario, you might need a backend service or a more complex
    // method to resolve this short URL to a direct image URL.
    // For this app, we'll assume the user provides a direct `googleusercontent` link.
    // We return the original shareable link with a warning in console for developers.
    console.warn("Google Photos shareable links (photos.app.goo.gl) cannot be directly converted to image sources. Please use the 'Copy Image Address' option in Google Photos.");
    return url; 
  }
  
  return url;
}
