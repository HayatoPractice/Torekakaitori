# 🎨 主要6大UIライブラリ共存＆参照マスターガイド (UI Library Coexistence & Reference Guide)

本ドキュメントは、現代のフロントエンド開発における主要な6つのUIライブラリを、競合を完全に防ぎながら1つのプロジェクト内で「いいとこ取り」して共存させるための、技術的設定基準と公式リファレンスURLを集約したマスターガイドです。

---

## ▌ 1. 6大UIライブラリの確実な参照先（公式ドキュメントURL）

各ライブラリの公式ドキュメントおよび最新バージョン情報は、以下の公式URLからいつでも確実にアクセスできます。

| ライブラリ名 | 確実な公式URL / 参照先 | 主な強み・使いどころ |
| :--- | :--- | :--- |
| 🚀 **HeroUI**<br>*(旧 NextUI)* | [https://www.heroui.com/](https://www.heroui.com/) | 表舞台UIの主役。最初から美しいモダンデザインと、極上のアニメーション（Framer Motion搭載）。 |
| 🛡️ **shadcn/ui** | [https://ui.shadcn.com/](https://ui.shadcn.com/) | 限界突破のカスタムパーツ用。ソースコードを直接コピーしてミリ単位で制御・改造が可能。 |
| 🏢 **MUI**<br>*(Material UI)* | [https://mui.com/](https://mui.com/) | 超多機能なデータ・分析エリア用。最強のデータグリッド（DataGrid）や高度な日付選択。 |
| ⚙️ **Ant Design** | [https://ant.design/](https://ant.design/) | 巨大な管理画面・設定用。高密度なデータ表示と、最高峰の親子連動フォーム機能。 |
| 🎨 **Tailwind UI**<br>*(Headless UI)* | [https://tailwindui.com/](https://tailwindui.com/)<br>[https://headlessui.com/](https://headlessui.com/) | LP・マーケティング画面用。最高品質のマークアップ（Tailwind UI）とアクセシブルな状態制御（Headless UI）。 |
| 🍃 **DaisyUI** | [https://daisyui.com/](https://daisyui.com/) | 脇役・超軽量パーツ用。ピュアCSS（JSなし）で読み込み負荷ゼロの基本部品。 |

---

## ▌ 2. 衝突を「ゼロ」にする共存アーキテクチャ (The Coexistence Blueprint)

これらすべてのライブラリを同じプロジェクト、あるいは同じ画面内で共存させる際、最も重大な課題は **「CSSスタイルの衝突（詳細度の競合）」** と **「グローバルスタイルの汚染」** です。
これらを技術的に完全に解決するための公式設定基準を以下に定義します。

### ① パスエイリアスの命名規則（インポート参照先の完全分離）
コンポーネントがどこに所属しているかをディレクトリ構造で完全に分離し、インポートエラーや競合を防ぎます。
`tsconfig.json`（または `jsconfig.json`）で以下のエイリアスを定義します。

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@shadcn/*": ["./src/components/ui/shadcn/*"],
      "@heroui/*": ["./src/components/ui/heroui/*"],
      "@daisy/*": ["./src/components/ui/daisy/*"],
      "@mui-custom/*": ["./src/components/ui/mui/*"]
    }
  }
}
```

### ② Tailwind CSS 側の優先度・プラグイン設定 (`tailwind.config.ts`)
Tailwindのユーティリティクラスが、MUIやAnt Designのスタイルに負けて上書きされるのを防ぐため、**TailwindのCSS詳細度を最優先**にする設定を行います。また、HeroUIとDaisyUIをTailwindのプラグインとして正しく共存させます。

```typescript
import { heroui } from "@heroui/react";
import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  // ① Tailwindクラスの優先度を上げる（ViteのアプリルートのIDを指定）
  important: '#root', 
  
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // ② HeroUI (旧NextUI) のコンポーネントファイルをスキャン対象に指定
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // ③ HeroUI プラグインの読み込み
    heroui(),
    // ④ DaisyUI プラグインの読み込み
    daisyui
  ],
  // DaisyUIの設定（テーマの競合を防ぐ）
  daisyui: {
    themes: ["light", "dark"],
    prefix: "daisy-", // ⚠️ DaisyUIのクラスには `daisy-` プレフィックスをつけ、競合を皆無にする！
  },
}
```

### ③ MUI のグローバルリセットをカプセル化する (`ScopedCssBaseline`)
MUIはデフォルトで画面全体に独自のスタイルリセット（`CssBaseline`）をかけ、TailwindやHeroUIのフォントや余白を壊してしまいます。
これを防ぐため、**MUIを使用するコンポーネントエリアだけを `<ScopedCssBaseline>` でカプセル化**します。

```tsx
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ScopedCssBaseline from '@mui/material/ScopedCssBaseline';
import { DataGrid } from '@mui/x-data-grid';

const muiTheme = createTheme({
  // 必要に応じてMUIのテーマを調整
});

export const MuiTableSection: React.FC = () => {
  return (
    <ThemeProvider theme={muiTheme}>
      {/* ⚠️ ScopedCssBaselineで囲むことで、MUIのCSS影響範囲をここだけに限定！ */}
      <ScopedCssBaseline>
        <div style={{ height: 400, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            initialState={{ pagination: { paginationModel } }}
            pageSizeOptions={[5, 10]}
            checkboxSelection
          />
        </div>
      </ScopedCssBaseline>
    </ThemeProvider>
  );
};
```

### ④ Ant Design のスタイル優先度調整 (`StyleProvider`)
Ant Design (v5) は CSS-in-JS を採用しているため、Tailwindのクラス名でAnt Designのコンポーネントのスタイルを上書きしにくい場合があります。これを解決するため、`StyleProvider` を使ってTailwindより下位にスタイルを挿入します。

```tsx
import React from 'react';
import { StyleProvider } from '@ant-design/cssinjs';
import { ConfigProvider, DatePicker } from 'antd';

export const AntdDatePickerSection: React.FC = () => {
  return (
    // ⚠️ hashPriority="high" または Tailwindより優先度が下がるように設定
    <StyleProvider hashPriority="high">
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#3b82f6', // Tailwindの blue-500 と自動同期
            borderRadius: 8,         // Tailwindの rounded-lg と自動同期
          },
        }}
      >
        <DatePicker.RangePicker className="w-full border-2 border-blue-500" />
      </ConfigProvider>
    </StyleProvider>
  );
};
```

---

## ▌ 3. パフォーマンス（表示速度）の極限維持ガイド

複数の大型UIライブラリを同じプロジェクトに導入した際、最も深刻な問題は「初期読み込み速度の低下（バンドルサイズの肥大化）」です。
これを**完全に無効化**するためのコード設計です。

### ① React Lazy / Next.js dynamic を用いた「遅延ロード」の徹底
画面の初期ロード時にすぐ目に入らない「重いコンポーネント（MUIのDataGridや複雑なグラフなど）」は、画面描画後に裏でロードするか、ユーザーがボタンを押した瞬間にインポートさせます。

```tsx
import React, { useState, Suspense } from 'react';

// ⚠️ 重いMUIのテーブルセクションを、初期表示時はJSロードせず遅延読み込み化
const HeavyMuiTable = React.lazy(() => import('./MuiTableSection').then(module => ({ default: module.MuiTableSection })));

export const DashboardPage: React.FC = () => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="p-8">
      {/* 初期表示される軽量なHeroUIのUI要素 */}
      <h1 className="text-2xl font-bold mb-4">データ分析ボード</h1>
      
      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        onClick={() => setShowTable(true)}
      >
        詳細データをロード
      </button>

      {/* ボタンが押されたら初めてMUIのJSがロードされるため、ページ全体の読み込みは一瞬で終わる */}
      {showTable && (
        <Suspense fallback={<div className="daisy-loading daisy-loading-spinner text-primary"></div>}>
          <HeavyMuiTable />
        </Suspense>
      )}
    </div>
  );
};
```


---

## ▌ 4. デザイン同期（デザイントークン連携）

異なるライブラリを使用しても、角丸やブランドカラーがバラバラにならないよう、Tailwind CSSの設定値を他のライブラリにプログラムで流し込みます。

```typescript
// src/styles/themeSync.ts
// Tailwindの設定値を一元管理し、MUIやAnt Designに動的適用するためのハブ

export const themeTokens = {
  colors: {
    primary: '#3b82f6', // Tailwind blue-500
    secondary: '#10b981', // Tailwind emerald-500
    background: '#ffffff',
    darkBackground: '#1f2937', // Tailwind gray-800
  },
  borderRadius: {
    sm: 4,   // rounded-sm
    md: 6,   // rounded
    lg: 8,   // rounded-lg
    xl: 12,  // rounded-xl
  }
};
```
MUIの `createTheme` や Ant Designの `ConfigProvider` では、上記の `themeTokens` を直接インポートして割り当てることで、デザインの一貫性を完全に自動で担保できます。

---

---

## ▌ 5. 目的別ライブラリ選定ガイド（AI生成精度を上げる選び方）

> どのライブラリを選ぶかでAIの生成精度が大きく変わる。目的と雰囲気から逆算して選ぶ。

### 選定マトリクス

| 作るもの | 推奨ライブラリ | 理由 |
|---|---|---|
| AIスタートアップ・テック系LP | **HeroUI**（旧NextUI） | 近未来的アニメーション・ダークモード・Tailwind統合でAIが書きやすい |
| シンプルな企業サイト・ポートフォリオ | **Chakra UI** | 装飾が控えめで上品なミニマリズム。余白の美しさが際立つ |
| 本格的なECサイト・オンラインショップ | **Shopify Polaris** | 世界最大ECのShopifyが実際に使う公式デザインシステム。「売れるUI」の心理学が詰まっている |
| 金融・医療・インフラ系B2Bシステム | **Carbon Design System**（IBM製） | 超カッチリした大企業向け。複雑なデータ表示・フォームを美しく整理 |
| 開発者向けツール・技術系ドキュメント | **Primer**（GitHub製） | GitHubのサイトを構成。視認性が高く実用主義的な美しさ |
| 素早いプロトタイプ・汎用LP | **daisyUI** | `btn btn-primary` だけでオシャレになる。AIに最も優しい短いクラス名 |
| データ分析・ダッシュボード | **MUI**（Material UI） | 最強のDataGrid・高度な日付選択。分析系画面は圧倒的 |
| 管理画面・設定パネル | **Ant Design** | 高密度なデータ表示・最高峰の親子連動フォームが得意 |

### AIへの具体的な指示文テンプレート

```
【モダンSaaS向け】
「フロントエンドはNext.jsとHeroUI（旧NextUI）を使用してください。
HeroUIの滑らかなアニメーションと洗練されたダークモードを活かし、
近未来的なAI企業のホームページに仕上げてください。
チープな既視感のあるテンプレートは避けること。」

【ECサイト向け】
「今回はビジネスで実際に運用するECサイトを作成します。
デザインの規律としてShopify Polarisのデザイン思想を徹底的に模倣してください。
信頼感があり、ユーザーが迷わないカート周りのUIを構築してください。」

【B2B管理画面向け】
「IBM Carbon Design Systemのグリッドシステムと色規則に準拠した
業務用ダッシュボードを作成してください。
データの視認性を最優先にし、余計な装飾は一切省いてください。」

【素早いプロトタイプ向け】
「daisyUIを使用し、最小限のコードで機能するプロトタイプを作成してください。
class名は短く直感的に。速度優先で実装してください。」
```

### Shopify Polaris について（ECサイト開発時の参考）

- 世界最大ECプラットフォームの公式デザインシステム（OSSで公開）
- 商品の並べ方・注文管理画面・チェックアウト導線のUXルールが内包
- 「売れるECサイト」を作るための心理学とデザインルールがすぐ使える
- 公式: https://polaris.shopify.com/

### Carbon Design System について（B2B開発時の参考）

- IBMがOSSで公開する大企業向けデザインシステム
- グリッドの規則性が非常に厳格。複雑な入力フォームやデータテーブルの整理が得意
- 公式: https://carbondesignsystem.com/

---

🎨 UI_LIBRARY_GUIDE.md v2.0 — 第2層。6大UIライブラリ共存設計＋目的別ライブラリ選定ガイド。
