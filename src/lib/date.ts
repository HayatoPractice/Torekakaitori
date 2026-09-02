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
