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
- カラー変数: `--bk: #151515`, `--white: #FDFDFD`, `--gray: #ECECEC`, `--primary: #E50035`
- `bg-bk`, `bg-primary`, `text-primary` 等の Tailwind カスタムカラーが使用可能

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
| 5 | 飲食チェーン店様 | true | Design, Coding | works02.jpg |
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

## CI/CD ルール

- **デプロイ**: GitHub Actions（`.github/workflows/deploy.yml`）で `main` push 時に自動ビルド → FTP デプロイ
- **push 後の確認**: `git push` 実行後は `gh run watch` で GitHub Actions の結果を確認し、成功・失敗をユーザーに報告すること
