"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { jsonFetcher } from "@/lib/api-client";
import type { User } from "@/lib/auth";

const LINKS = [
  { href: "/", label: "投稿を登録" },
  { href: "/entries", label: "日別に見る" },
  { href: "/accounts", label: "アカウント管理" },
  { href: "/items", label: "レビュー待ち" },
  { href: "/products", label: "商品・相場比較" },
  { href: "/bookmarklet", label: "ブックマークレット" },
  { href: "/settings", label: "設定" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { data } = useSWR<{ user: User }>("/api/auth/me", jsonFetcher);
  const links = data?.user.is_admin ? [...LINKS, { href: "/users", label: "ユーザー管理" }] : LINKS;

  return (
    <nav className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-1 px-4 py-3">
        <span className="mr-4 font-bold text-sm tracking-wide">トレカ相場確認</span>
        {links.map((link) => {
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
    </nav>
  );
}
