import type { NextRequest } from "next/server";

export interface RequestUser {
  id: string;
  isAdmin: boolean;
}

/** proxy.tsが検証済みのユーザー情報をヘッダーから取り出す（未認証はありえない想定だがnullも返せるようにする） */
export function getRequestUser(req: NextRequest): RequestUser | null {
  const id = req.headers.get("x-user-id");
  if (!id) return null;
  return { id, isAdmin: req.headers.get("x-is-admin") === "true" };
}
