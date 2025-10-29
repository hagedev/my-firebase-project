'use client';

import { ReactNode } from 'react';

// Layout ini sekarang menjadi komponen "bodoh" yang hanya merender children.
// Semua logika autentikasi dan pengalihan telah dipindahkan ke dalam
// komponen halaman itu sendiri (contoh: src/app/admin/page.tsx)
// untuk mencegah race condition.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
