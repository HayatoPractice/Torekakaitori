import { NextRequest, NextResponse } from "next/server";
import { countAdmins, deleteUser, getUserById, resetUserPassword } from "@/lib/auth";
import { getRequestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

interface Params {
  params: Promise<{ id: string }>;
}

/** PATCH /api/users/[id] { password } — 他ユーザーのパスワードをリセットする（管理者のみ） */
export async function PATCH(req: NextRequest, { params }: Params) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "管理者のみ利用できます" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const password = String(body.password ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上にしてください` }, { status: 400 });
  }

  await resetUserPassword(id, password);
  return NextResponse.json({ ok: true });
}

/** DELETE /api/users/[id] — ユーザー削除（管理者のみ。最後の管理者は削除できない） */
export async function DELETE(req: NextRequest, { params }: Params) {
  const me = getRequestUser(req);
  if (!me) return NextResponse.json({ error: "認証情報が見つかりません" }, { status: 401 });
  if (!me.isAdmin) return NextResponse.json({ error: "管理者のみ利用できます" }, { status: 403 });

  const { id } = await params;
  const target = await getUserById(id);
  if (target?.is_admin && (await countAdmins()) <= 1) {
    return NextResponse.json({ error: "最後の管理者は削除できません" }, { status: 400 });
  }

  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
