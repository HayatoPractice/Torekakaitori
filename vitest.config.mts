import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

/**
 * このプロジェクトのAPIルートは本番と共通のNeon DBへ直接接続する統合テストとして書く
 * （テストDBを別途用意していないため）。書き込み系テストは独自のprefixで作ったデータのみを
 * 対象にし、afterEach/afterAllで必ず削除する（tests/helpers.ts参照）。
 * DB書き込みの競合を避けるため、テストファイル間・ファイル内ともに並列実行はしない。
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
