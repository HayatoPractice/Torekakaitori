"use client";

import { useEffect, useState } from "react";

function buildBookmarkletCode(appOrigin: string): string {
  const body = `
    var url = location.href;
    var text = (window.getSelection ? window.getSelection().toString() : '');
    var appUrl = ${JSON.stringify(appOrigin)} + '/?url=' + encodeURIComponent(url) + (text ? '&text=' + encodeURIComponent(text) : '');
    window.open(appUrl, '_blank');
  `.replace(/\s+/g, " ");
  return `javascript:(function(){${body}})();`;
}

export default function BookmarkletPage() {
  const [code, setCode] = useState("");

  useEffect(() => {
    // window.location はSSR時に存在しないため、マウント後に読んでhydrationミスマッチを避ける
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(buildBookmarkletCode(window.location.origin));
  }, []);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">ブックマークレット</h1>
      <p className="text-sm opacity-70">
        X（Twitter）で投稿を開いた状態でこのボタンを押すと、投稿URL（と選択していたテキスト）を
        自動で入力した状態で登録フォームが開きます。下のリンクをブラウザのブックマークバーへ
        ドラッグ＆ドロップして登録してください。
      </p>

      {code && (
        <a
          href={code}
          onClick={(e) => e.preventDefault()}
          className="inline-block cursor-move select-none rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          🔖 トレカ相場に追加
        </a>
      )}

      <div>
        <p className="mb-1 text-sm font-medium">ドラッグできない場合</p>
        <p className="mb-2 text-xs opacity-60">
          下のコードをコピーし、新規ブックマークを作成してURL欄に貼り付けてください。
        </p>
        <textarea
          readOnly
          value={code}
          rows={4}
          className="w-full rounded-md border border-black/15 bg-transparent p-2 font-mono text-xs dark:border-white/20"
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>

      <p className="text-xs opacity-50">
        ※ スマートフォンのXアプリ内ブラウザなど、ブックマークレットが動作しない環境もあります。
        その場合は投稿URLをコピーして登録フォームに直接貼り付けてください。画像はブックマークレットでは
        取得できないため、必要に応じてスクリーンショットを別途アップロードしてください。
      </p>
    </div>
  );
}
