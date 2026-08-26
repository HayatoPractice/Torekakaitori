"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "torecasouba:selectedAccountIds";

/**
 * チェックしたアカウントIDの集合をlocalStorageで永続化する。
 * ページ遷移・再読み込みをまたいでも選択状態を保つため。
 */
export function useSelectedAccounts() {
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);

  useEffect(() => {
    // localStorageはSSR時に存在しないため、マウント後に読んでhydrationミスマッチを避ける
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setSelectedIdsState(JSON.parse(raw));
    } catch {
      // 読めない場合は空のまま
    }
  }, []);

  const setSelectedIds = useCallback((ids: string[]) => {
    setSelectedIdsState(ids);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // プライベートブラウズ等で書き込めない場合は無視
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      setSelectedIds(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    },
    [selectedIds, setSelectedIds]
  );

  return { selectedIds, toggle, setSelectedIds };
}
