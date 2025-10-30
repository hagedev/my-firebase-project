'use client';

import { ReactNode } from 'react';
import { FirebaseClientProvider } from '@/firebase';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FirebaseClientProvider>
      {children}
    </FirebaseClientProvider>
  );
}
