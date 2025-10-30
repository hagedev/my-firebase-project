'use client';

// Merepresentasikan struktur data dari sebuah dokumen Tenant di Firestore.
export interface Tenant {
  id: string; // ID dokumen dari Firestore
  name: string;
  slug: string;
  tokenHarian: string;
  logoUrl?: string;
  qrisImageUrl?: string;
  address?: string;
  ownerName?: string;
  phoneNumber?: string;
  receiptMessage?: string;
}

// Merepresentasikan struktur data dari sebuah dokumen User di Firestore.
export interface User {
    id: string; // ID dokumen dari Firestore, akan sama dengan authUid
    authUid: string; // Firebase Auth UID
    email: string;
    role: 'admin_kafe' | 'superadmin';
    tenantId?: string; // ID tenant/kafe yang dikelola
    tenantName?: string; // Denormalized tenant name for easy display
}

// Merepresentasikan struktur data dari sebuah dokumen Menu di Firestore.
export interface Menu {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    price: number;
    categoryId: string;
    available: boolean;
}
