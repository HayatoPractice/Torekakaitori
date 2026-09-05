import { afterAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { getSql } from "@/lib/db";
import { GET } from "@/app/api/export/csv/route";
import { cleanupTestData, prefixed } from "../helpers";

const sql = getSql();

const HEADER = "投稿日,アカウント,商品名,種別,価格区分,価格,確信度,レビュー状態,投稿URL";

/**
 * res.text()は使わない。WHATWGのUTF-8デコード仕様上、TextDecoderは既定で先頭のBOMを
 * 自動的に読み飛ばしてしまい、「BOMが付いているか」をJS文字列側から確認できなくなるため。
 * ignoreBOM: true で生バイト（EF BB BF）に対応するU+FEFFを文字列に残したままデコードする。
 */
async function decodeKeepingBom(res: Response): Promise<string> {
  const buffer = await res.arrayBuffer();
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(buffer);
}

/** RFC4180準拠の1行だけを対象にした簡易CSVパーサー（テスト用。""による引用符エスケープに対応） */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let value = "";
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === '"') {
          if (line[j + 1] === '"') {
            value += '"';
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        value += line[j];
        j += 1;
      }
      fields.push(value);
      i = j + 1; // 直後のカンマを読み飛ばす
    } else {
      const commaIdx = line.indexOf(",", i);
      if (commaIdx === -1) {
        fields.push(line.slice(i));
        break;
      }
      fields.push(line.slice(i, commaIdx));
      i = commaIdx + 1;
    }
  }
  return fields;
}

async function createScopedRow(opts: {
  accountName: string;
  productName: string;
  priceType: "sell" | "buy";
  price: number;
}) {
  const accountRows = await sql`
    INSERT INTO accounts (handle, display_name) VALUES (${prefixed(opts.accountName + "-h")}, ${opts.accountName})
    RETURNING id
  `;
  const accountId = accountRows[0].id as string;

  const postRows = await sql`
    INSERT INTO posts (account_id, posted_date, source_url)
    VALUES (${accountId}, '2024-02-01', ${prefixed(opts.accountName + "-post")})
    RETURNING id
  `;
  const postId = postRows[0].id as string;

  await sql`
    INSERT INTO extracted_items (post_id, account_id, product_id, product_name_raw, item_type, price_type, price, confidence)
    VALUES (${postId}, ${accountId}, NULL, ${opts.productName}, 'box', ${opts.priceType}, ${opts.price}, 0.5)
  `;

  return { accountId };
}

describe("GET /api/export/csv", () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  it("ヘッダー行・BOM・カンマ/改行/ダブルクォートのエスケープを確認する", async () => {
    const accountName = prefixed("店舗、カンマ,テスト");
    const productName = prefixed('商品"引用"名\n改行あり,カンマ');
    const { accountId } = await createScopedRow({
      accountName,
      productName,
      priceType: "buy",
      price: 5000,
    });

    const req = new NextRequest(`http://localhost/api/export/csv?account_id=${accountId}`);
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(res.headers.get("content-disposition")).toContain(".csv");

    const text = await decodeKeepingBom(res);
    // BOM（Excelでの文字化け防止）が先頭に付与されている
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const body = text.slice(1);
    const lines = body.split("\r\n");

    expect(lines[0]).toBe(HEADER);
    expect(lines.length).toBeGreaterThanOrEqual(2);

    const fields = parseCsvLine(lines[1]);
    expect(fields[0]).toBe("2024-02-01");
    expect(fields[1]).toBe(accountName);
    expect(fields[2]).toBe(productName); // ""→"のアンエスケープ・改行の保持を確認
    expect(fields[3]).toBe("box");
    expect(fields[4]).toBe("買取"); // price_type: buy → 買取
    expect(fields[5]).toBe("5000");
    expect(fields[7]).toBe("pending_review");

    // 特殊文字を含むフィールドは実際に引用符で囲まれている（生のCSV文字列側でも確認）
    expect(lines[1]).toContain(`"${accountName}"`);
    expect(lines[1]).toContain(`""引用""`); // ダブルクォートが""にエスケープされている
  });

  it("特殊文字を含まないプレーンな値は引用符で囲まれない", async () => {
    const accountName = prefixed("プレーン店舗");
    const productName = prefixed("プレーン商品");
    const { accountId } = await createScopedRow({
      accountName,
      productName,
      priceType: "sell",
      price: 3000,
    });

    const req = new NextRequest(`http://localhost/api/export/csv?account_id=${accountId}`);
    const res = await GET(req);
    const text = await decodeKeepingBom(res);
    const lines = text.slice(1).split("\r\n");

    expect(lines[0]).toBe(HEADER);
    const dataLine = lines[1];
    expect(dataLine).not.toContain('"');

    const fields = parseCsvLine(dataLine);
    expect(fields[1]).toBe(accountName);
    expect(fields[2]).toBe(productName);
    expect(fields[4]).toBe("販売"); // price_type: sell → 販売
  });
});
