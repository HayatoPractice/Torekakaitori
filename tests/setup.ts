import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * .env.local（本番Neon DBと共通の接続文字列）をテスト実行前に読み込む。
 * dotenv等の依存を増やさず、必要最小限のパーサーで済ませる。
 * 既にプロセス環境変数にある値は上書きしない（CI等で別途注入されるケースを優先する）。
 */
function loadEnvLocal(): void {
  const path = fileURLToPath(new URL("../.env.local", import.meta.url));
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL が読み込めませんでした。.env.local に DATABASE_URL を設定してください（tests/setup.ts が読み込みます）。\n" +
      "テストは本番と共通のNeon DBに接続する統合テストのため、この変数が無いと実行できません。"
  );
}
