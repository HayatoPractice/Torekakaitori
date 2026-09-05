const KANJI_DIGITS: Record<string, number> = {
  "〇": 0, "零": 0, "一": 1, "二": 2, "三": 3, "四": 4,
  "五": 5, "六": 6, "七": 7, "八": 8, "九": 9,
};

/** 漢数字（一〜三十一）を数値に変換する。変換できなければnull */
function kanjiToNumber(s: string): number | null {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (!/^[〇零一二三四五六七八九十]+$/.test(s)) return null;
  if (s === "十") return 10;
  const tenIdx = s.indexOf("十");
  if (tenIdx === -1) return KANJI_DIGITS[s] ?? null;
  const tensPart = s.slice(0, tenIdx);
  const onesPart = s.slice(tenIdx + 1);
  const tens = tensPart ? KANJI_DIGITS[tensPart] : 1;
  const ones = onesPart ? KANJI_DIGITS[onesPart] : 0;
  if (tens == null || ones == null) return null;
  return tens * 10 + ones;
}

/**
 * 日付の自由入力（"2026-1-1"／"2026/1/1"／"2026年1月1日"／"2026年1月一日"等）を
 * "YYYY-MM-DD"（月日が無ければ"YYYY-MM"や"YYYY"）に正規化する。
 * 解釈できなければ元の文字列をそのまま返す（bucket文字列との前方一致比較にフォールバックするため）
 */
export function normalizeDateInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/[年/]/g, "-").replace(/月/g, "-").replace(/日\s*$/, "");
  const parts = normalized.split("-").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return trimmed;

  const nums = parts.map(kanjiToNumber);
  if (nums.some((n) => n == null) || nums[0] == null) return trimmed;

  const [y, mo, d] = nums as number[];
  const yStr = String(y).padStart(4, "0");
  if (mo == null) return yStr;
  const moStr = String(mo).padStart(2, "0");
  if (d == null) return `${yStr}-${moStr}`;
  return `${yStr}-${moStr}-${String(d).padStart(2, "0")}`;
}

/** この端末のローカル日付（YYYY-MM-DD）を返す */
export function todayLocalDate(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

/** ISO日時（UTC）をこの端末のローカル日付（YYYY-MM-DD）に変換する。壊れていれば今日を返す */
export function toLocalDate(iso: string | null): string {
  if (!iso) return todayLocalDate();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayLocalDate();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
