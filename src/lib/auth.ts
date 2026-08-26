import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";

interface Credentials {
  username: string;
  passwordSalt: string;
  passwordHash: string;
}

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

/**
 * 現在の認証情報を返す。DBに設定済みならそちらを優先し、無ければ環境変数
 * （BASIC_AUTH_USER/BASIC_AUTH_PASSWORD）にフォールバックする。
 * DB行が無い状態＝一度も設定画面で変更していない初期状態。
 */
export async function getCredentials(): Promise<Credentials | null> {
  const sql = getSql();
  const rows = await sql`SELECT username, password_salt, password_hash FROM auth_credentials WHERE id = true`;
  if (rows.length > 0) {
    return {
      username: rows[0].username as string,
      passwordSalt: rows[0].password_salt as string,
      passwordHash: rows[0].password_hash as string,
    };
  }

  const envUser = process.env.BASIC_AUTH_USER;
  const envPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!envPassword) return null; // 認証設定なし＝保護しない（proxy.ts側の既定動作に委ねる）

  const salt = "env"; // 環境変数フォールバック時は固定salt（DBに保存しないため使い捨て）
  return {
    username: envUser || "torecasouba",
    passwordSalt: salt,
    passwordHash: hashPassword(envPassword, salt),
  };
}

export function verifyPassword(candidate: string, creds: Credentials): boolean {
  const candidateHash = hashPassword(candidate, creds.passwordSalt);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(creds.passwordHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** 設定画面から呼ばれる。新しいユーザー名・パスワードをDBへ保存する */
export async function updateCredentials(username: string, password: string): Promise<void> {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const sql = getSql();
  await sql`
    INSERT INTO auth_credentials (id, username, password_salt, password_hash, updated_at)
    VALUES (true, ${username}, ${salt}, ${passwordHash}, now())
    ON CONFLICT (id) DO UPDATE SET
      username = EXCLUDED.username,
      password_salt = EXCLUDED.password_salt,
      password_hash = EXCLUDED.password_hash,
      updated_at = now()
  `;
}
