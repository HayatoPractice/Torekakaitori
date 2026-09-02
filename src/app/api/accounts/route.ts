import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql, isPgError, PG_UNIQUE_VIOLATION } from "@/lib/db";
import { optionalText, parseBody, requiredText } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getSql();
  const accounts = await sql`SELECT * FROM accounts ORDER BY display_name`;
  return NextResponse.json({ accounts });
}

const createAccountSchema = z.object({
  handle: requiredText("handle は必須です"),
  display_name: requiredText("display_name は必須です"),
  notes: optionalText,
  url: optionalText,
});

export async function POST(req: NextRequest) {
  const parsed = parseBody(createAccountSchema, await req.json());
  if ("error" in parsed) return parsed.error;
  const { handle, display_name, notes, url } = parsed.data;

  const sql = getSql();
  try {
    const created = await sql`
      INSERT INTO accounts (handle, display_name, notes, url)
      VALUES (${handle}, ${display_name}, ${notes}, ${url})
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
