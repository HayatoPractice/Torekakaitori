"use client";

import { useState } from "react";

/**
 * グラフの凡例クリックで、その系列だけ表示/非表示を切り替えられるようにする。
 * Rechartsの<Line>/<Bar>のhide propと、<Legend>のonClick/formatterに渡して使う。
 */
export function useLegendToggle() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  function isHidden(key: string): boolean {
    return hidden.has(key);
  }

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /** <Legend onClick={onLegendClick} /> にそのまま渡す */
  function onLegendClick(entry: { dataKey?: unknown }) {
    if (typeof entry.dataKey === "string") toggle(entry.dataKey);
  }

  /** <Legend formatter={legendFormatter} /> にそのまま渡す（非表示の系列は打ち消し線で示す） */
  function legendFormatter(value: string) {
    return (
      <span
        style={{
          textDecoration: isHidden(value) ? "line-through" : "none",
          opacity: isHidden(value) ? 0.4 : 1,
          cursor: "pointer",
        }}
      >
        {value}
      </span>
    );
  }

  return { isHidden, toggle, onLegendClick, legendFormatter };
}
