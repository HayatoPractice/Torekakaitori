// 画像をクライアント側でリサイズ・圧縮してBase64(JPEG)で返すユーティリティ。
// 目的：
//   1. 大きすぎる画像によるAPIエラー・転送遅延を防ぐ（長辺を縮小）
//   2. Claudeの画像入力に適したサイズ（長辺1568px程度）へ最適化する
// ※ 'use client' なコンポーネントからのみ呼び出すこと（canvas/Imageはブラウザ専用）

const DEFAULT_MAX_DIMENSION = 1568; // Claude推奨の長辺上限
const DEFAULT_QUALITY = 0.85;

export async function resizeImage(
  file: File,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
  quality: number = DEFAULT_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // 長辺が上限を超える場合のみ、アスペクト比を維持して縮小する
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('画像の処理に失敗しました（Canvas未対応）。'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // JPEGとして圧縮（写真用途のためPNG等もJPEGへ統一）
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.onerror = () => reject(new Error('画像の読み込みに失敗しました。もう一度お試しください。'));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました。もう一度お試しください。'));
    reader.readAsDataURL(file);
  });
}
