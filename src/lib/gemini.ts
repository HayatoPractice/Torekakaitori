import { GoogleGenAI, Type } from "@google/genai";
import type { AnalyzedItem } from "@/types/domain";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

/**
 * Gemini呼び出しの上限時間。/api/posts の maxDuration（60秒）より必ず短くすること。
 * 超えたまま関数がタイムアウトすると、投稿がpendingのまま固まって理由も残らない。
 */
export const GEMINI_TIMEOUT_MS = 45000;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("環境変数 GEMINI_API_KEY が設定されていません。.env.local を確認してください。");
  }
  return new GoogleGenAI({ apiKey });
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          product_name_raw: {
            type: Type.STRING,
            description: "商品名（BOX/パック名）。シリーズ名を含め、できるだけ原文のまま。",
          },
          item_type: { type: Type.STRING, enum: ["box", "pack", "other"] },
          price_type: {
            type: Type.STRING,
            enum: ["sell", "buy"],
            description: "sell=店が売る価格（販売）, buy=店が買い取る価格（買取）",
          },
          price: { type: Type.INTEGER, description: "日本円の整数値。カンマ・円記号を含めない。" },
          confidence: {
            type: Type.NUMBER,
            description: "この抽出結果の自己評価の確信度。0.0〜1.0。",
          },
        },
        required: ["product_name_raw", "item_type", "price_type", "price", "confidence"],
      },
    },
  },
  required: ["items"],
};

const SYSTEM_PROMPT = `あなたはトレーディングカードショップの投稿（テキストまたは画像）から、
BOX・パック単位の価格情報を抽出する専門アシスタントです。

# 抽出ルール
- 1件の投稿に複数の商品・価格が含まれる場合は、それぞれを別アイテムとして抽出すること
- 「買取」「高価買取」「買取価格」等の表現は price_type=buy
- 「販売」「税込」「入荷」等、店がユーザーに売る価格は price_type=sell。文脈上どちらか不明で、
  価格表示のみの通常の商品紹介であれば sell として扱う
- 価格は日本円の整数のみ（カンマ・円マーク・税表記を除く）。範囲表記（例: 5000〜6000円）は
  中央値ではなく低い方の値を採用し、confidenceを0.5以下に下げる
- カード単品（1枚もの）の価格情報は対象外。BOX・パック単位の価格のみを抽出する
  （迷った場合は item_type=other として含めてよい）
- 商品・価格情報が一切含まれない場合は items を空配列で返す
- confidenceは、価格や商品名の読み取りに自信がないほど低くすること（手書きPOP・不鮮明な画像・
  文脈からの推測が必要な場合は0.6以下を目安にする）`;

async function runAnalysis(parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>): Promise<AnalyzedItem[]> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      httpOptions: { timeout: GEMINI_TIMEOUT_MS },
    },
  });

  const text = response.text;
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as { items?: AnalyzedItem[] };
    return (parsed.items ?? []).map(normalizeItem).filter((item): item is AnalyzedItem => item !== null);
  } catch {
    throw new Error("Geminiの応答をJSONとして解析できませんでした");
  }
}

function normalizeItem(raw: AnalyzedItem): AnalyzedItem | null {
  if (!raw || typeof raw.price !== "number" || raw.price < 0) return null;
  if (!raw.product_name_raw?.trim()) return null;
  return {
    product_name_raw: raw.product_name_raw.trim(),
    item_type: ["box", "pack", "other"].includes(raw.item_type) ? raw.item_type : "other",
    price_type: raw.price_type === "buy" ? "buy" : "sell",
    price: Math.round(raw.price),
    confidence: Math.min(1, Math.max(0, raw.confidence ?? 0.5)),
  };
}

/** 貼り付けられたテキスト（複数投稿分のまとめ貼りも可）を解析する */
export async function analyzeText(rawText: string): Promise<AnalyzedItem[]> {
  const trimmed = rawText.trim();
  if (!trimmed) return [];
  return runAnalysis([{ text: `以下はXに投稿されたトレカショップの投稿本文です。複数の投稿が改行で連結されている場合もあります。\n\n---\n${trimmed}\n---` }]);
}

/** 画像1枚（base64）を解析する */
export async function analyzeImage(base64Data: string, mimeType: string): Promise<AnalyzedItem[]> {
  return runAnalysis([
    { text: "この画像はXに投稿されたトレカショップの価格POP・値札・投稿画像です。写っている商品と価格を抽出してください。" },
    { inlineData: { mimeType, data: base64Data } },
  ]);
}

/** テキストと複数画像をまとめて1回の呼び出しで解析する（レート制限対策で呼び出し回数を抑える） */
export async function analyzeCombined(
  rawText: string | null,
  images: Array<{ base64Data: string; mimeType: string }>
): Promise<AnalyzedItem[]> {
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  parts.push({
    text: "以下はXに投稿されたトレカショップの投稿です。本文と添付画像の両方から、商品と価格を抽出してください。",
  });
  if (rawText?.trim()) {
    parts.push({ text: `本文:\n${rawText.trim()}` });
  }
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64Data } });
  }
  if (parts.length === 1) return [];
  return runAnalysis(parts);
}
