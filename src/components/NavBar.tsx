"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/api-client";
import type { Account } from "@/types/domain";

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
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === "/";
  const { data } = useSWR<{ accounts: Account[] }>("/api/accounts", jsonFetcher);
  const accountsWithUrl = (data?.accounts ?? []).filter((a) => a.url);

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
    <nav className="sticky top-0 z-20 border-b border-black/10 bg-background dark:border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1 px-4 py-3">
        <div className="flex items-center gap-2">
          {!isHome && (
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="前の画面に戻る"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg hover:bg-black/5 dark:hover:bg-white/10"
            >
              ←
            </button>
          )}
          <Link href="/" className="font-bold text-sm tracking-wide hover:opacity-70">
            トレカ相場確認
          </Link>
        </div>

        <div className="flex items-center gap-1">
          {accountsWithUrl.length > 0 && (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10">
                🔗 アカウント
              </summary>
              <div className="absolute right-0 z-30 mt-1 w-56 max-w-[80vw] rounded-md border border-black/10 bg-background p-2 shadow-lg dark:border-white/10">
                <p className="mb-1 px-1 text-[11px] opacity-50">投稿を見に行く（新しいタブで開く）</p>
                <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
                  {accountsWithUrl.map((a) => (
                    <a
                      key={a.id}
                      href={a.url!}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate rounded px-2 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      ↗ {a.display_name}
                    </a>
                  ))}
                </div>
              </div>
            </details>
          )}

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
