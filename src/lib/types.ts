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

// Merepresentasikan struktur data dari sebuah dokumen User di Firestore.
export interface User {
    id: string; // ID dokumen dari Firestore
    authUid: string; // Firebase Auth UID
    email: string;
    role: 'admin_kafe' | 'superadmin';
    tenantId?: string; // ID tenant/kafe yang dikelola
    tenantName?: string; // Denormalized tenant name for easy display
}
