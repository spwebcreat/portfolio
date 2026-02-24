# コンテンツデータ管理ガイド

サイト内のコンテンツデータを `src/data/` に一元管理し、各コンポーネントはそこから読み取る方針。
スキルの追加・案件の追加・ナビゲーション変更など、**JSON を 1 箇所編集するだけ**で全画面に反映される状態を目指す。

---

## 現状（2026-02-24 時点）

### 一元化済み

| データ | ファイル | 消費コンポーネント |
|--------|---------|-------------------|
| スキル情報 | `src/data/skills.json` | SkillCrystal.tsx, MainVisual/index.astro, CastleReactions.tsx, About.astro |

### 未一元化（コンポーネント内にインライン定義）

| データ | 現在の定義場所 | 移行先（予定） | 備考 |
|--------|---------------|---------------|------|
| クライアント実績 (Works) | `Works.astro` L11-138 | `src/data/works.json` | 7 件。画像は import が必要なため別途対応 |
| 自主制作 (Projects) | `Projects.astro` L7-52 | `src/data/projects.json` | 3 件。同上 |
| ナビゲーション | `Header/index.astro` L4-8 | `src/data/navigation.json` | 3 項目 |
| ブログカテゴリ設定 | `src/lib/blog.ts` L3-13 | `src/data/blog-config.json` | labels + colors |

---

## ディレクトリ構成

```
src/data/
  skills.json          # スキル情報（一元化済み）
  skillTypes.ts        # スキル型定義
  works.json           # クライアント実績（予定）
  worksTypes.ts        # Works 型定義（予定）
  projects.json        # 自主制作プロジェクト（予定）
  projectsTypes.ts     # Projects 型定義（予定）
  navigation.json      # ヘッダーナビ（予定）
  blog-config.json     # ブログカテゴリ設定（予定）
```

---

## 一元化済みデータ仕様

### skills.json

スキル 1 件あたりのフィールド:

| フィールド | 型 | 用途 |
|-----------|------|------|
| `id` | string | 一意識別子。クリスタル ID・ボタン連携に使用 |
| `title` | string | 短いラベル（ボタン・クリスタルパネル表示用） |
| `aboutTitle` | string | About セクション見出し（長めでもOK） |
| `description` | string | クリスタル詳細パネルの説明文 |
| `skillTags` | string[] | スキルタグ（クリスタルパネル・About 共通） |
| `effectKey` | string | CastleReactions のエフェクト名 |
| `crystal` | object \| null | 3D 固有パラメータ。将来クリスタルなしスキルは `null` |

#### crystal オブジェクト

| フィールド | 型 | 説明 |
|-----------|------|------|
| `model` | string | GLB モデルパス（`/models/` 配下） |
| `orbit.radius` | number | 公転半径 |
| `orbit.height` | number | 軌道の基準高さ |
| `orbit.speed` | number | 個別速度（後方互換。実際は `SHARED_ORBIT_SPEED` を使用） |
| `orbit.phase` | number | 初期角度オフセット (度) |
| `orbit.tilt` | number | 軌道面の傾斜角 (度) |
| `orbit.tiltDir` | number | 傾斜方向 (度) |
| `emissiveBase` | number | 発光ベース強度 |
| `lightColor` | string | ポイントライト色 (hex) |

#### 型定義

`src/data/skillTypes.ts` で `SkillEntry`, `CrystalParams`, `OrbitParams` を定義。

#### 消費マッピング

```
skills.json
  ├─ SkillCrystal.tsx     → id, title, description, skillTags, crystal.*
  ├─ MainVisual/index.astro → id, title（ボタン生成）
  ├─ CastleReactions.tsx   → id, effectKey（エフェクトマッピング）
  └─ About.astro           → aboutTitle, skillTags（スキル一覧表示）
```

#### スキル追加手順

1. `src/data/skills.json` にエントリを追加
2. 3D クリスタルが必要なら `crystal` に GLB パス・軌道パラメータを設定（不要なら `null`）
3. CastleReactions に新エフェクトが必要なら `effectKey` を設定し、対応エフェクトコンポーネントを追加
4. `npm run dev` で確認

---

## 一元化予定データ仕様

### works.json（クライアント実績）

現在 `Works.astro` の frontmatter にインライン定義されている 7 件の案件データ。

#### フィールド

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `sort` | number | Yes | 表示順（昇順ソート） |
| `image` | string | Yes | 画像ファイル名（`works00.jpg` 等） |
| `title` | string | Yes | 表示名（anonymous 時は業種名等で伏せる） |
| `anonymousTitle` | string | Yes | 非公開時の代替タイトル |
| `url` | string | Yes | サイト URL |
| `anonymous` | boolean | Yes | 掲載許可フラグ |
| `scope` | string[] | Yes | 制作範囲（`"design"`, `"coding"`） |
| `tech` | string[] | Yes | 使用技術タグ |
| `tags` | string[] | Yes | 分類タグ |
| `description` | string | Yes | 説明文 |

#### 画像の扱い

Astro の画像最適化（`astro:assets`）を利用するため、JSON には画像ファイル名のみを記載し、
コンポーネント側で動的 import する方式を検討:

```typescript
// Works.astro
import worksData from '@/data/works.json'

const images = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/img/works*.jpg', { eager: true }
)

const portfolio = worksData.map(item => ({
  ...item,
  image: images[`../assets/img/${item.image}`]?.default,
}))
```

---

### projects.json（自主制作プロジェクト）

| フィールド | 型 | 必須 | 説明 |
|-----------|------|------|------|
| `image` | string | Yes | 画像ファイル名 |
| `title` | string | Yes | プロジェクト名 |
| `url` | string | Yes | プロジェクト URL |
| `stats` | object \| null | No | 数値ハイライト `{ value, label }` |
| `tech` | string[] | Yes | 使用技術タグ |
| `description` | string | Yes | 説明文 |

---

### navigation.json（ヘッダーナビ）

```json
[
  { "name": "About", "href": "/#about" },
  { "name": "Projects", "href": "/#projects" },
  { "name": "Blog", "href": "/blog/" }
]
```

---

### blog-config.json（ブログカテゴリ設定）

```json
{
  "categories": {
    "tech":      { "label": "Tech",      "color": "border-sky-400 text-sky-400" },
    "knowledge": { "label": "Knowledge", "color": "border-primary text-primary" },
    "diary":     { "label": "Diary",     "color": "border-emerald-400 text-emerald-400" }
  }
}
```

---

## 一元化しないデータ

以下はコンポーネント固有のパラメータであり、外部化するメリットが薄い:

| データ | ファイル | 理由 |
|--------|---------|------|
| TIME_CONFIG（照明タイムライン） | ThreeModel/index.tsx | 3D レンダリング固有。変更頻度が極めて低い |
| GEO_OFFSET / POSITIONS（クリスタル配置） | ThreeModel/index.tsx | モデル座標に依存。JSON 化しても恩恵なし |
| windowPositions（窓ライト座標） | CastleReactions.tsx | エフェクト固有の内部実装 |
| WEATHER_MULTIPLIERS | weatherTypes.ts | 天気 API の演出パラメータ。独立したドメイン |
| TOKYO（デフォルト位置） | useWeather.ts | 定数 1 つのみ |
| Footer のコピーライト | Footer.astro | 静的テキスト 1 行のみ |

---

## 設計原則

1. **Single Source of Truth** — 同じデータを 2 箇所以上に書かない
2. **型安全** — 各 JSON に対応する `*Types.ts` を用意し、`as` キャストで型付け
3. **画像は import.meta.glob** — Astro 画像最適化を維持するため、JSON にはファイル名のみ記載
4. **後方互換** — export の形状を維持し、消費側の変更を最小限に
5. **段階的移行** — 一度に全部やらず、セクションごとに移行・検証

---

## 移行チェックリスト

- [x] Skills（スキル情報） → `src/data/skills.json`
- [ ] Works（クライアント実績） → `src/data/works.json`
- [ ] Projects（自主制作） → `src/data/projects.json`
- [ ] Navigation（ヘッダーナビ） → `src/data/navigation.json`
- [ ] Blog config（カテゴリ設定） → `src/data/blog-config.json`
