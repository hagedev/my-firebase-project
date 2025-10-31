import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'AirCafe',
  description: 'Pemesanan digital untuk kafe modern.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
       <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#FF9800" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
