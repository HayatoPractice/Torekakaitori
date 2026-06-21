import type { Metadata, Viewport } from 'next';
import './globals.css';
import BottomNav from '@/components/BottomNav';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'VintVerify | ヴィンテージ古着AI鑑定・仕入れ判定',
  description: '写真を撮るだけでAIが古着のブランド・年代・相場を瞬時に判定。仕入れ判断をサポートするコレクター・転売ヤーのための鑑定ツール',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VintVerify',
  },
};

export const viewport: Viewport = {
  themeColor: '#0e0d0c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="safe-bottom-nav md:pb-0 md:flex bg-[#0e0d0c]">
        <Sidebar />
        <main className="flex-1 w-full max-w-md mx-auto px-4 py-6 md:max-w-5xl md:px-8 md:ml-64 transition-all">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
