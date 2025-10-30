'use client';

// Merepresentasikan struktur data dari sebuah dokumen Tenant di Firestore.
export interface Tenant {
  id: string; // ID dokumen dari Firestore
  name: string;
  slug: string;
  tokenHarian: string;
  logoUrl?: string;
  qrisImageUrl?: string;
}
