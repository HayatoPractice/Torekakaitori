import { createHash } from "node:crypto";

/** 完全一致の重複投稿検知に使うハッシュ（テキスト＋画像バイト列） */
export function computeContentHash(rawText: string | null, imageBuffers: Buffer[]): string {
  const h = createHash("sha256");
  h.update(rawText?.trim() ?? "");
  for (const buf of imageBuffers) {
    h.update(buf);
  }
  return h.digest("hex");
}
