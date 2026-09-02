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

/** extracted_items にアカウント名・投稿情報を結合した表示用の型 */
export interface ExtractedItemView extends ExtractedItem {
  account_handle: string;
  account_display_name: string;
  posted_date: string;
  source_url: string | null;
}

/** Gemini解析が1件の投稿から返す構造化データ */
export interface AnalyzedItem {
  product_name_raw: string;
  item_type: ItemType;
  price_type: PriceType;
  price: number;
  confidence: number;
}
