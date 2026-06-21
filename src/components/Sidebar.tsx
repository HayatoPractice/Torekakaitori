'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  // 認証画面ではナビゲーションを表示しない
  if (pathname === '/auth') {
    return null;
  }

  const navItems = [
    {
      label: '鑑定',
      path: '/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
        </svg>
      ),
    },
    {
      label: '履歴',
      path: '/history',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: 'ナレッジ投稿',
      path: '/knowledge/submit',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: 'マイページ',
      path: '/auth',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#1c1917]/90 border-r border-[rgba(212,175,55,0.15)] backdrop-blur-md px-4 py-8 shadow-[4px_0_24px_rgba(0,0,0,0.4)] z-50">
      {/* サイトロゴ等 */}
      <div className="mb-10 px-2 flex items-center space-x-2">
        <div className="w-8 h-8 rounded bg-[rgba(212,175,55,0.1)] border border-[#d4af37] flex items-center justify-center text-[#d4af37] font-bold text-xl">
          V
        </div>
        <h1 className="text-xl font-extrabold tracking-tight gold-gradient-text">VintVerify</h1>
      </div>

      {/* ナビゲーション */}
      <nav className="flex flex-col space-y-4">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center space-x-4 py-3 px-4 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-[rgba(212,175,55,0.1)] text-[#d4af37] border border-[rgba(212,175,55,0.2)] scale-[1.02]'
                  : 'text-[#a39c93] hover:text-[#f5f2eb] hover:bg-neutral-800/40 active:scale-[0.98]'
              }`}
            >
              <div className={`transition-colors duration-300 ${isActive ? 'text-[#d4af37]' : ''}`}>
                {item.icon}
              </div>
              <span className="text-sm font-semibold tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      
      {/* 下部の補足情報など */}
      <div className="mt-auto px-2">
        <p className="text-[10px] text-[#6e675f]">© 2026 VintVerify.</p>
        <p className="text-[10px] text-[#6e675f]">Vintage Appraisal AI Assistant.</p>
      </div>
    </aside>
  );
}
