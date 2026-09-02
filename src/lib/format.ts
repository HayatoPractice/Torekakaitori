import type { PriceType } from "@/types/domain";

/**
 * 日本円表示。Rechartsのformatter/tickFormatterは値の型がunknown寄りになる
 * （undefined・配列を含む）ため、あえて広く受けてから丸めて整形する
 */
export function formatYen(value: unknown): string {
  return `¥${Math.round(Number(value)).toLocaleString()}`;
}

/** 価格区分の日本語ラベル */
export function priceTypeLabel(priceType: PriceType): string {
  return priceType === "buy" ? "買取" : "販売";
}
