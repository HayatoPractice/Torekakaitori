export type ItemType = "box" | "pack" | "other";
export type PriceType = "sell" | "buy";
export type ReviewStatus = "confirmed" | "pending_review" | "rejected";
export type PostStatus = "pending" | "processed" | "error";

export interface Account {
  id: string;
  handle: string;
  display_name: string;
  notes: string | null;
  url: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  canonical_name: string;
  item_type: ItemType;
  has_image: boolean;
  resale_notes: string | null;
  release_date: string | null; // YYYY-MM-DD（カードの実際の発売日。created_atとは別物）
  retail_price: number | null; // 発売時の定価（税込・円）
  /** 個人間（フリマ）相場。情報源がシュリンク有無を区別しないため単一値 */
  secondary_market_price_individual: number | null;
  secondary_market_trend_individual: string | null;
  /** 買取相場（シュリンク有、またはシュリンク区分の無い商品の唯一の値） */
  secondary_market_price_buyback_shrink: number | null;
  secondary_market_trend_buyback_shrink: string | null;
  /** 買取相場・シュリンク無。シュリンク区分が無い商品はnull */
  secondary_market_price_buyback_noshrink: number | null;
  secondary_market_trend_buyback_noshrink: string | null;
  secondary_market_checked_at: string | null;
  created_at: string;
}

export interface ProductAlias {
  id: string;
  product_id: string;
  alias_text: string;
  created_at: string;
}

export interface Post {
  id: string;
  account_id: string;
  posted_date: string; // YYYY-MM-DD
  source_url: string | null;
  raw_text: string | null;
  content_hash: string | null;
  status: PostStatus;
  error_message: string | null;
  created_at: string;
}

/** 画像本体（bytea）はここに含めない。一覧APIでは重いため /api/images/[id] で個別取得する */
export interface PostImage {
  id: string;
  post_id: string;
  mime_type: string;
  created_at: string;
}

export interface ExtractedItem {
  id: string;
  post_id: string;
  account_id: string;
  product_id: string | null;
  product_name_raw: string;
  item_type: ItemType;
  price_type: PriceType;
  price: number;
  confidence: number;
  review_status: ReviewStatus;
  created_at: string;
}

/** Gemini解析が1件の投稿から返す構造化データ */
export interface AnalyzedItem {
  product_name_raw: string;
  item_type: ItemType;
  price_type: PriceType;
  price: number;
  confidence: number;
}
