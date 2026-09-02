"use client";

import type { Account } from "@/types/domain";

interface Props {
  accounts: Account[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll?: () => void;
  onClearAll?: () => void;
}

/** アカウントを縦一覧表示し、チェックが入ったものだけを対象にする（フィルター用） */
export default function AccountCheckboxList({ accounts, selectedIds, onToggle, onSelectAll, onClearAll }: Props) {
  return (
    <div className="rounded-lg border border-black/10 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-black/10 px-3 py-2 text-xs dark:border-white/10">
        <span className="font-medium opacity-70">アカウント（チェックしたものだけ表示）</span>
        <div className="shrink-0 space-x-3">
          {onSelectAll && (
            <button type="button" onClick={onSelectAll} className="hover:underline">
              すべて選択
            </button>
          )}
          {onClearAll && (
            <button type="button" onClick={onClearAll} className="hover:underline">
              解除
            </button>
          )}
        </div>
      </div>
      <ul className="max-h-64 overflow-y-auto">
        {accounts.map((a) => (
          <li key={a.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
            <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
              <input
                type="checkbox"
                checked={selectedIds.includes(a.id)}
                onChange={() => onToggle(a.id)}
                className="h-4 w-4 shrink-0"
              />
              <span className="min-w-0 break-words">
                {a.display_name} <span className="opacity-50">{a.handle}</span>
              </span>
            </label>
          </li>
        ))}
        {accounts.length === 0 && <li className="px-3 py-2 text-sm opacity-60">アカウントがありません</li>}
      </ul>
    </div>
  );
}
