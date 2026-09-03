/** ブラウザで選択されたファイル（Blob）をbase64文字列（data URLのヘッダーを除いた部分）に変換する */
export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** これより小さいファイルは圧縮せずそのまま使う（スクリーンショット等、既に十分小さいもの向け） */
const IMAGE_COMPRESS_THRESHOLD_BYTES = 800 * 1024;
/** 圧縮後の最大の辺の長さ（px）。トレカの値札・価格の読み取りにはこれで十分で、それ以上は時間がかかるだけ */
const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_JPEG_QUALITY = 0.85;

/**
 * スマホカメラで撮った未圧縮の写真（数MB・4000px超）をそのままアップロードすると、
 * アップロード自体やAI解析に時間がかかりすぎてサーバー側のタイムアウト（504）を招くことがある。
 * ここで十分な大きさ・画質に落としてから送ることで、読み取り精度を大きく落とさずに軽くする。
 */
export async function prepareImageForUpload(file: File): Promise<{ base64Data: string; mimeType: string }> {
  if (file.size <= IMAGE_COMPRESS_THRESHOLD_BYTES) {
    return { base64Data: await fileToBase64(file), mimeType: file.type };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas未対応");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", IMAGE_JPEG_QUALITY));
    if (!blob) throw new Error("圧縮に失敗");

    return { base64Data: await fileToBase64(blob), mimeType: "image/jpeg" };
  } catch {
    // 古いブラウザ等で圧縮に失敗した場合は、圧縮せず元のファイルをそのまま使う
    return { base64Data: await fileToBase64(file), mimeType: file.type };
  }
}
