import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";

export interface User {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
}

interface UserWithHash extends User {
  password_salt: string;
  password_hash: string;
}

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function verifyPassword(candidate: string, salt: string, expectedHash: string): boolean {
  const candidateHash = hashPassword(candidate, salt);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** proxy.tsから呼ばれる。Basic認証のユーザー名・パスワードを検証し、一致すればユーザー情報を返す */
export async function authenticate(username: string, password: string): Promise<User | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, username, password_salt, password_hash, is_admin, created_at
    FROM users WHERE username = ${username}
  `;
  if (rows.length === 0) return null;
  const user = rows[0] as unknown as UserWithHash;
  if (!verifyPassword(password, user.password_salt, user.password_hash)) return null;
  return { id: user.id, username: user.username, is_admin: user.is_admin, created_at: user.created_at };
}

export async function getUserById(userId: string): Promise<User | null> {
  const sql = getSql();
  const rows = await sql`SELECT id, username, is_admin, created_at FROM users WHERE id = ${userId}`;
  if (rows.length === 0) return null;
  return rows[0] as unknown as User;
}

export async function listUsers(): Promise<User[]> {
  const sql = getSql();
  const rows = await sql`SELECT id, username, is_admin, created_at FROM users ORDER BY created_at`;
  return rows as unknown as User[];
}

/** 自分自身のユーザー名・パスワードを変更する（設定画面から） */
export async function updateOwnCredentials(userId: string, username: string, password: string): Promise<void> {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const sql = getSql();
  await sql`
    UPDATE users SET username = ${username}, password_salt = ${salt}, password_hash = ${passwordHash}
    WHERE id = ${userId}
  `;
}

/** 管理者がユーザーを追加する */
export async function createUser(username: string, password: string, isAdmin: boolean): Promise<User> {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const sql = getSql();
  const rows = await sql`
    INSERT INTO users (username, password_salt, password_hash, is_admin)
    VALUES (${username}, ${salt}, ${passwordHash}, ${isAdmin})
    RETURNING id, username, is_admin, created_at
  `;
  return rows[0] as unknown as User;
}

/** 管理者が他ユーザーのパスワードをリセットする */
export async function resetUserPassword(userId: string, password: string): Promise<void> {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const sql = getSql();
  await sql`UPDATE users SET password_salt = ${salt}, password_hash = ${passwordHash} WHERE id = ${userId}`;
}

export async function deleteUser(userId: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM users WHERE id = ${userId}`;
}

export async function countAdmins(): Promise<number> {
  const sql = getSql();
  const rows = await sql`SELECT count(*)::int AS count FROM users WHERE is_admin = true`;
  return rows[0].count as number;
}
