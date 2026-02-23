# SP WEBCREAT. ポートフォリオサイト

## プロジェクト概要

フリーランス WEB エンジニア / UI・UX デザイナーのポートフォリオサイト。

- **フレームワーク**: Astro 4 + React
- **スタイル**: Tailwind CSS 3 + Stylus
- **3D**: Three.js (react-three/fiber)
- **スムーススクロール**: Lenis
- **フォント**: Montserrat (Google Fonts)
- **アナリティクス**: GTM (Partytown経由)
- **ビルド**: `astro check && astro build`
- **開発サーバー**: `npm run dev`

## ページ構成

`src/pages/index.astro` にて以下の順で表示:

1. **MainVisual** — Three.js 3D ビジュアル
2. **About** — 自己紹介
3. **Projects** — 自主制作プロジェクト
4. **Works** — クライアント実績
5. **Blogs** — ブログ

## スタイル規約

- Stylus 内で Tailwind の `@apply` を使用
- Stylus では `/` が除算として解釈されるため、`aspect-ratio` 等は CSS ネイティブプロパティで記述する（`@apply aspect-[4/3]` は使用不可）
- Stylus では `:` がプロパティ区切りとして解釈されるため、`@apply hover:opacity-80` 等のコロン付き Tailwind ユーティリティは使用不可。代わりに `&:hover` + `@apply opacity-80` を使用する
- カラー変数: `--bk: #151515`, `--white: #FDFDFD`, `--gray: #ECECEC`, `--primary: #E50035`
- `bg-bk`, `bg-primary`, `text-primary` 等の Tailwind カスタムカラーが使用可能

---

## 3Dアセット

### 実装済みアセット一覧（public/models/）
- floating-castle.glb — 城＋岩盤メイン
- crystal-*.glb × 5 — スキルの結晶（衛星軌道周回 + クリックインタラクション）
- drone-scout.glb — 偵察ドローン
- orbital-ring.glb — 巨大リング（遠景）
- mechanical-bird.glb — 機械の鳥

> **注記**: tiny-wanderer.glb（ローブの旅人）はシーンから削除済み。アセットファイルは残存。

### 共通仕様
- アクセントカラー: #00e5ff（シアン）
- GLB: Draco圧縮レベル6、Y-up座標系
- Dracoデコーダー: https://www.gstatic.com/draco/versioned/decoders/1.5.6/

### 3Dシーン詳細
- パラメータ調整: `docs/3d-tuning-guide.md` 参照
- 未着手タスク・ロードマップ: `docs/r3f-knowledge.md` 参照
- プロジェクト完了記録: `docs/3d-enhancement-report.md` 参照

---

## Works セクション仕様 (`src/components/Layouts/Works.astro`)

クライアント制作実績を表示するセクション。

### データ構造

```ts
{
  sort: number,           // 表示順（昇順ソート）
  image: ImageMetadata,   // スクリーンショット画像（src/assets/img/works{N}.jpg）
  title: string,          // 表示名（anonymous時は業種名等で伏せる）
  url: string,            // サイトURL（anonymous時は非表示）
  anonymous: boolean,     // 掲載許可フラグ
  scope: ('design' | 'coding')[],  // 制作範囲
  tech: string[],         // 使用技術タグ
  description: string,    // 説明文
}
```

### anonymous フラグ（掲載許可管理）

| anonymous | 動作 |
|-----------|------|
| `false` | タイトル実名表示、URL リンク有効、URL テキスト表示 |
| `true` | タイトルを伏せた表記、リンク無効（div）、URL 非表示、「掲載許可申請中」バッジ表示 |

**許可が取れた場合の変更手順:**
1. `anonymous: false` に変更
2. `title` を実名に変更
3. 必要に応じて `description` を更新

### scope バッジ（制作範囲表示）

各案件のタイトル下に表示されるアウトラインバッジ:

- **Design** — `border-primary text-primary`（赤アウトライン）
- **Coding** — `border-sky-400 text-sky-400`（水色アウトライン）

コーディングのみ担当の案件は `scope: ['coding']` として明示。

### sort（並び順制御）

- `sort` の数値が小さい順に表示
- テンプレートで `[...portfolio].sort((a, b) => a.sort - b.sort)` によりソート
- 並び替えは `sort` の数値を変更するだけで可能

### 現在の Works 一覧

| sort | title | anonymous | scope | image |
|------|-------|-----------|-------|-------|
| 1 | FOR U様 | false | Design, Coding | works00.jpg |
| 2 | 合同会社CLAB.様 | false | Design, Coding | works01.jpg |
| 3 | SOU様 | false | Design, Coding | works04.jpg |
| 4 | SOU WEDDING様 | false | Design, Coding | works05.jpg |
| 5 | 株式会社てりとりー様 | false | Design, Coding | works02.jpg |
| 6 | 不動産会社様 | true | Coding | works03.jpg |
| 7 | 結婚相談所様 | true | Coding | works06.jpg |

### 画像ファイル

- 配置先: `src/assets/img/works{N}.jpg`
- import でビルド時に最適化される（Astro Image）
- カード画像は `aspect-ratio: 4/3` + `object-cover`

---

## Projects セクション仕様 (`src/components/Layouts/Projects.astro`)

自主制作プロジェクトを表示するセクション。

### データ構造

```ts
{
  image: ImageMetadata,
  title: string,
  url: string,
  stats?: { value: string, label: string },  // オプション: 数値ハイライト
  tech: string[],
  description: string,
}
```

### stats バッジ（数値ハイライト）

- オプショナル。設定された場合のみ表示
- タイトル直下に赤背景（`bg-primary`）+ 白文字のラウンドバッジで表示
- `value`: 大きく表示される数値（例: "10"）
- `label`: 数値の説明（例: "サイト 運用保守中"）

### 現在の Projects 一覧

| title | stats | 備考 |
|-------|-------|------|
| AI MONSTER CREATOR. | - | Next.js 14 + AI画像生成 |
| SP WEB CREAT. | - | 当サイト（Astro + Three.js） |
| WP MANAGE PORTAL. | 10 サイト運用保守中 | フルスクラッチ業務システム |

---

## 案件追加手順

### Works に新しい案件を追加する場合

1. スクリーンショットを `src/assets/img/works{N}.jpg` に配置
2. `Works.astro` の frontmatter で画像を import
3. `portfolio` 配列にエントリを追加:
   - 掲載許可済み: `anonymous: false`, `title` に実名
   - 掲載確認中: `anonymous: true`, `title` に業種名等
4. `sort` で表示位置を調整

### Projects に新しいプロジェクトを追加する場合

1. スクリーンショットを `src/assets/img/projects{N}.jpg` に配置
2. `Projects.astro` の frontmatter で画像を import
3. `portfolio` 配列にエントリを追加
4. 数値アピールが必要なら `stats` を設定

---

## Blogs セクション仕様

技術記事と制作ノウハウを発信するブログセクション。

**詳細な設計判断は `docs/adr-001-blog-architecture.md` を参照。**

### 構築ロードマップ

| Phase | データソース | 状態 |
|-------|-------------|------|
| Phase 1 | Markdown (Astro Content Collections) | 構築済み |
| Phase 2 | ヘッドレス CMS (未選定) | Phase 1 完了後に検討 |

### コンテンツ方針

- **技術記事** (`category: tech`): 開発Tips、技術検証、学習記録 — バッジ: 水色
- **制作ノウハウ** (`category: knowledge`): デザイン・コーディングの制作過程、クライアントワークの知見 — バッジ: 赤
- **日常** (`category: diary`): 日常の出来事、雑記、ブログ運営 — バッジ: 緑

### ページ構成

- トップページ (`index.astro`): 最新3件をカード表示
- ブログ一覧: `/blog` で全記事一覧
- 詳細ページ: `/blog/[slug]` で記事本文表示

### 記事の投稿手順

#### 1. MD ファイルを作成

`src/content/blog/` に `.md` ファイルを追加する。ファイル名がそのまま URL のスラッグになる。

```
src/content/blog/my-new-post.md  →  /blog/my-new-post/
```

#### 2. frontmatter を記述

```yaml
---
title: "記事タイトル"
description: "記事の概要（一覧カード・OGPに表示される）"
pubDate: "2026-02-17"
category: "tech"              # "tech", "knowledge", or "diary"
tags: ["Astro", "React"]      # 任意のタグ
draft: false                  # true にすると本番では非表示（開発時は表示）
heroImage: "../../assets/img/blog/my-hero.jpg"  # optional: カード・詳細ページのヒーロー画像
# updatedDate: "2026-02-18"   # optional: 更新日
# ogImage: "/img/blog/og.jpg" # optional: OGP専用画像（heroImageと別にしたい場合）
---
```

#### 3. 本文を Markdown で記述

通常の Markdown 記法がすべて使える（見出し、リスト、コードブロック、テーブル等）。

### 記事内の画像

`public/img/blog/` に画像を配置し、絶対パスで参照する:

```markdown
![スクリーンショット](/img/blog/screenshot.jpg)
```

> **注意**: 本文内の `![](...)` では Astro の画像最適化（WebP変換等）は効かない。
> `heroImage` は `src/assets/` の相対パスで指定でき、自動最適化される。

### 記事内の動画

YouTube / Vimeo はそのまま HTML を記述:

```markdown
<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID" frameborder="0" allowfullscreen></iframe>
```

自前の動画ファイルは `public/video/` に配置:

```markdown
<video src="/video/demo.mp4" controls muted playsinline></video>
```

### ファイル配置まとめ

| 用途 | 配置先 | 参照方法 |
|------|--------|---------|
| ヒーロー画像 | `src/assets/img/blog/` | frontmatter の `heroImage` に相対パス |
| 記事本文の画像 | `public/img/blog/` | `![alt](/img/blog/file.jpg)` |
| 動画ファイル | `public/video/` | `<video src="/video/file.mp4">` |

### Frontmatter スキーマ

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `title` | string | Yes | 記事タイトル |
| `description` | string | Yes | 記事の概要 |
| `pubDate` | Date | Yes | 公開日 |
| `updatedDate` | Date | No | 更新日 |
| `category` | `'tech'` \| `'knowledge'` \| `'diary'` | Yes | カテゴリ |
| `tags` | string[] | No | タグ（デフォルト: `[]`） |
| `draft` | boolean | No | 下書きフラグ（デフォルト: `false`） |
| `heroImage` | image | No | ヒーロー画像（`src/assets/` からの相対パス） |
| `ogImage` | string | No | OGP専用画像（`public/` からの絶対パス） |

### 移行時の注意点

- Phase 2 移行時、URL 構造 (`/blog/[slug]`) は維持すること
- SEO（OGP, メタタグ）は Phase 1 から対応済み

---

## サムネイル生成設定

ブログ記事のサムネイル（heroImage）を Gemini API で自動生成する際のプロジェクト固有設定。

### デフォルト値

| 設定 | 値 | 説明 |
|------|-----|------|
| `model` | `gemini-3-pro-image-preview` | 使用する Gemini モデル（3回失敗で flash に自動フォールバック） |
| `mood` | `auto` | 記事内容から自動判定 |
| `aspect` | `4:3` | アスペクト比（カード表示に合わせる） |
| `output_dir` | `src/assets/img/blog/` | 画像の格納先 |
| `heroImage_path` | `../../assets/img/blog/{slug}.jpg` | frontmatter に記述する相対パス |

### ムード別カラーパレット

記事のタイトル・説明・タグから「雰囲気（ムード）」を自動判定し、内容に合った配色を適用する:

| ムード | 色味 | こんな記事向け |
|--------|------|---------------|
| `educational` | 青・シアン | 解説・ハウツー・技術記事 |
| `urgent` | 赤・オレンジ | 注意喚起・速報・重要系 |
| `inspirational` | 緑・ライム | やる気・成長・挑戦系 |
| `professional` | グレー・インディゴ | ビジネス・仕事系 |
| `friendly` | 黄・ピンク | 雑談・日常・エンタメ系 |
| `creative` | 赤・アンバー | デザイン・制作・クリエイティブ系 |

自動判定が合わない場合は `--mood educational` 等で明示指定可能。

### プロンプト指示

- **記事内容ドリブン**: タイトル・説明・タグから記事のテーマを視覚的に表現するリアルなシーンを生成
- **ムード別カラー**: 記事の雰囲気に合った配色をシネマティックな照明として適用
- **リアル指向**: フォトリアリスティックまたは高品質3Dレンダー風。抽象パターンではなく具象的なビジュアル
- `--keyword` で英語キーワードを補助的に配置可能（例: `"AI FILTER"`, `"ASTRO"`）。**英語のみ**
- `--mood` で明示指定も可能（例: `--mood urgent`, `--mood creative`）
- `--reference` で参照画像を指定可能。ブランドロゴやデザインテンプレートを渡すと、そのスタイル・配色・モチーフを反映したサムネイルを生成する（例: `--reference src/assets/img/noimage.jpg`）

### 生成後の処理

1. 画像を `src/assets/img/blog/{slug}.jpg` に保存
2. 記事の frontmatter の `heroImage` を `"../../assets/img/blog/{slug}.jpg"` に設定
3. 生成された画像をユーザーに表示して確認

---

## CI/CD ルール

- **デプロイ**: GitHub Actions（`.github/workflows/deploy.yml`）で `main` push 時に自動ビルド → FTP デプロイ
- **push 後の確認**: `git push` 実行後は `gh run watch` で GitHub Actions の結果を確認し、成功・失敗をユーザーに報告すること
