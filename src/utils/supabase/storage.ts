import { createAdminClient } from './server';

/**
 * Base64形式の画像をSupabase Storageにアップロードし、公開URLを返します。
 * @param base64Data Base64エンコードされた画像データ (データURIスキップ済み、または含む)
 * @param pathName 保存先のパス名 (例: "userId/uniqueId.jpg")
 * @returns 公開URL文字列
 */
export async function uploadBase64Image(base64Data: string, pathName: string): Promise<string> {
  const supabase = createAdminClient(); // ストレージ操作のために管理者権限を使用

  // Base64のプレフィックス (data:image/jpeg;base64,) を除去
  const base64Body = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Body, 'base64');

  // MIMEタイプを特定 (デフォルトはimage/jpeg)
  const mimeMatch = base64Data.match(/^data:(image\/\w+);base64,/);
  const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const bucketName = 'vint-verify-images';

  // アップロード
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(pathName, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload image to storage: ${error.message}`);
  }

  // 公開URLの取得
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(pathName);

  return publicUrl;
}
