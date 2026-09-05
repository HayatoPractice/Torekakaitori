import { NextResponse } from "next/server";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** ヘッダー行＋データ行からCSV文字列（Excel向けBOM付き）を組み立てる */
export function buildCsv(header: string[], rows: unknown[][]): string {
  const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
  return "﻿" + csv; // Excelでの文字化け防止
}

export function csvResponse(header: string[], rows: unknown[][], filename: string): NextResponse {
  return new NextResponse(buildCsv(header, rows), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
