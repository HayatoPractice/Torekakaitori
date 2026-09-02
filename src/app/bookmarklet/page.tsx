"use client";

import { useEffect, useState } from "react";

/**
 * X APIは一切呼ばない。ユーザーがブラウザで開いている「今見えているページのDOM」を
 * そのまま読み取るだけ（ユーザー自身のログイン状態の中で完結）なので、無料枠の制約は
 * 受けない。ただしXのDOM構造（data-testid等）に依存するため、Xの仕様変更で
 * 動かなくなることがある（bookmarklet・ブラウザ拡張全般に共通する制約）。
 *
 * タイムライン/プロフィールページ（複数のarticle[data-testid="tweet"]がある）では
 * 直近の投稿を一括で読み取り、/api/scrape-import に送ってから /post/bulk を開く。
 * それ以外のページ（記事の個別ページ等、articleが1件も見つからない場合）は
 * 従来どおり現在のURLと選択テキストだけを /post に渡す（フォールバック）。
 *
 * window.open は非同期処理（fetch）の後に呼ぶとポップアップブロックの対象になるため、
 * クリック直後に空タブを同期的に開いておき、fetch完了後にそのタブのlocationを
 * 差し替える方式にしている。
 */
function buildBookmarkletCode(appOrigin: string): string {
  const body = `
    var origin = ${JSON.stringify(appOrigin)};
    var win = window.open('', '_blank');
    if (win && win.document) { win.document.write('取り込み中...'); }
    function textOf(article) {
      var el = article.querySelector('[data-testid="tweetText"]');
      return el ? el.innerText.trim() : '';
    }
    function urlOf(article) {
      var timeEl = article.querySelector('time');
      var a = timeEl ? timeEl.closest('a') : null;
      return a ? a.href : '';
    }
    function dateOf(article) {
      var timeEl = article.querySelector('time');
      return timeEl ? timeEl.getAttribute('datetime') : null;
    }
    function imagesOf(article) {
      var imgs = Array.prototype.slice.call(article.querySelectorAll('img[src*="pbs.twimg.com/media"]'));
      var urls = imgs.map(function (img) { return img.src.replace(/name=\\w+/, 'name=large'); });
      return urls.filter(function (u, i) { return urls.indexOf(u) === i; });
    }
    var articles = Array.prototype.slice.call(document.querySelectorAll('article[data-testid="tweet"]'));
    if (articles.length === 0) {
      var sel = (window.getSelection ? window.getSelection().toString() : '');
      var appUrl = origin + '/post?url=' + encodeURIComponent(location.href) + (sel ? '&text=' + encodeURIComponent(sel) : '');
      if (win) { win.location.href = appUrl; } else { window.open(appUrl, '_blank'); }
    } else {
      var items = articles.map(function (a) {
        return { text: textOf(a), url: urlOf(a), postedDate: dateOf(a), imageUrls: imagesOf(a) };
      }).filter(function (it) { return it.text || it.imageUrls.length > 0; });
      if (items.length === 0) {
        if (win) { win.document.write('取り込める投稿が見つかりませんでした。このタブは閉じてください'); }
      } else {
        fetch(origin + '/api/scrape-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: location.href, items: items })
        }).then(function (r) { return r.json(); }).then(function (data) {
          if (data && data.id && win) { win.location.href = origin + '/post/bulk?batch=' + data.id; }
          else if (win) { win.document.write('取り込みに失敗しました: ' + (data && data.error ? data.error : '不明なエラー')); }
        }).catch(function (e) {
          if (win) { win.document.write('取り込みに失敗しました: ' + e.message); }
        });
      }
    }
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
        店舗のXプロフィール/タイムラインページを開いた状態でこのボタンを押すと、画面に表示されている
        直近の投稿（本文・画像・投稿日時）をまとめて読み取り、取り込み内容を確認する画面が新しいタブで
        開きます。下のリンクをブラウザのブックマークバーへドラッグ＆ドロップして登録してください。
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

      <div className="space-y-1 text-xs opacity-50">
        <p>
          ※ 投稿が1件も検出されない個別ページ等では、従来どおり投稿URL（と選択していたテキスト）だけを
          渡す登録フォームが開きます。
        </p>
        <p>
          ※ スマートフォンのXアプリ内ブラウザなど、ブックマークレットが動作しない環境もあります。
          その場合は投稿URLをコピーして登録フォームに直接貼り付けてください。
        </p>
        <p>
          ※ Xのページ構造が変わると、まとめて読み取る機能が動かなくなることがあります
          （ブラウザ拡張・ブックマークレット全般に共通する制約です）。
        </p>
      </div>
    </div>
  );
}
