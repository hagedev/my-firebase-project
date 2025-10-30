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
 * Converts a public Google Drive sharing URL to a direct image link.
 * @param url The public Google Drive URL (e.g., drive.google.com/file/d/...).
 * @returns A direct image link usable in <img> src, or the original URL if not a Google Drive link.
 */
export function convertGoogleDriveUrl(url: string): string {
  const G_DRIVE_REGEX = /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
  const match = url.match(G_DRIVE_REGEX);
  
  if (match && match[1]) {
    const fileId = match[1];
    return `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  
  return url;
}
