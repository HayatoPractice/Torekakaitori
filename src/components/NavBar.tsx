"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "商品・相場比較" },
  { href: "/post", label: "投稿を登録" },
  { href: "/entries", label: "日別に見る" },
  { href: "/accounts", label: "アカウント管理" },
  { href: "/items", label: "レビュー待ち" },
  { href: "/bookmarklet", label: "ブックマークレット" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // ページ遷移したら開けっぱなしにならないよう自動で閉じる
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  // 開いている間は背景のスクロールを止める（スマホでドロワーの裏が動くと操作しづらいため）
  useEffect(() => {
    if (!menuOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [menuOpen]);

  // Escapeキーでも閉じられるようにする
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <nav className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1 px-4 py-3">
        <span className="font-bold text-sm tracking-wide">トレカ相場確認</span>

        {/* 通常幅：横並びのナビ（スマホでは隠す） */}
        <div className="hidden flex-wrap items-center gap-1 sm:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* スマホ幅：右上のハンバーガーボタン */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="メニューを開く"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-black/5 sm:hidden dark:hover:bg-white/10"
        >
          <span className="flex flex-col gap-1">
            <span className="h-0.5 w-5 bg-foreground" />
            <span className="h-0.5 w-5 bg-foreground" />
            <span className="h-0.5 w-5 bg-foreground" />
          </span>
        </button>
      </div>

      {/* スマホ幅：右からスライドインするメニュー */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 sm:hidden ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMenuOpen(false)}
        aria-hidden={!menuOpen}
      />
      <div
        className={`fixed inset-y-0 right-0 z-50 w-64 max-w-[80vw] transform bg-background shadow-xl transition-transform duration-300 ease-in-out sm:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="メニュー"
      >
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
          <span className="font-bold text-sm tracking-wide">メニュー</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="メニューを閉じる"
            className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-black/5 dark:hover:bg-white/10"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-foreground text-background"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
