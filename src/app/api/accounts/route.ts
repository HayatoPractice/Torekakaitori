import { NextRequest, NextResponse } from "next/server";
import { getSql, isPgError, PG_UNIQUE_VIOLATION } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getSql();
  const accounts = await sql`SELECT * FROM accounts ORDER BY display_name`;
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const handle = String(body.handle ?? "").trim();
  const displayName = String(body.display_name ?? "").trim();
  const notes = body.notes ? String(body.notes).trim() : null;
  const url = body.url ? String(body.url).trim() : null;

  if (!handle || !displayName) {
    return NextResponse.json({ error: "handle と display_name は必須です" }, { status: 400 });
  }

  const sql = getSql();
  try {
    const created = await sql`
      INSERT INTO accounts (handle, display_name, notes, url)
      VALUES (${handle}, ${displayName}, ${notes}, ${url})
      RETURNING *
    `;
    return NextResponse.json({ account: created[0] }, { status: 201 });
  } catch (err) {
    if (isPgError(err, PG_UNIQUE_VIOLATION)) {
      return NextResponse.json({ error: `アカウント「${handle}」は既に登録されています` }, { status: 409 });
    }
    const message = err instanceof Error ? err.message : "登録に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
