---
name: blog-thumbnail-generator
description: "Generate blog thumbnail/hero images and in-article images using the Gemini API. Use when the user asks to create a thumbnail, hero image, OG image, or article illustration. Triggers: サムネイル生成, サムネ作って, ブログ画像生成, 記事の画像作って, generate thumbnail, create hero image, 記事内画像, batch thumbnails, サムネ一括生成. Also triggers when creating a new blog post that needs a hero image. Supports single/batch generation, mood-based color palettes, hero and article image modes, and reference image input."
---

# Blog Thumbnail Generator

Generate blog images from article metadata using Gemini API image generation.
Two modes: **hero** (thumbnail/OG) and **article** (in-article illustrations).

## Requirements

- `GEMINI_API_KEY` in project `.env`
- Python 3 (stdlib only; Pillow optional for PNG→JPEG)

## Quick Start

### Single Hero Image

```bash
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env | cut -d= -f2)
python3 .claude/skills/blog-thumbnail-generator/scripts/generate_thumbnail.py \
  --title "記事タイトル" \
  --slug "article-slug" \
  --output "src/assets/img/blog/article-slug.jpg"
```

### In-Article Image

```bash
python3 .claude/skills/blog-thumbnail-generator/scripts/generate_thumbnail.py \
  --title "記事タイトル" \
  --slug "article-slug" \
  --output "public/img/blog/article-slug-fig1.jpg" \
  --mode article \
  --scene "コードエディタでTypeScriptを書いている開発者のデスク"
```

### Batch Generation

```bash
python3 .claude/skills/blog-thumbnail-generator/scripts/generate_thumbnail.py \
  --batch articles.json
```

## Project Configuration

Check the project `CLAUDE.md` for `サムネイル生成設定`. Use those values as defaults:

- `aspect` — e.g., `4:3`
- `mood` — default: `auto`
- `model` — preferred model
- `output_dir` — image destination
- `heroImage_path` — frontmatter path template

## Models (Auto-Selection by Mode)

`--model auto` (default): モードに応じて最適なモデルを自動選択。

| Mode | Auto-selected Model | ID | Why |
|------|--------------------|----|-----|
| `hero` | **Pro 3** | `gemini-3-pro-image-preview` | 高品質、複雑な構図に強い |
| `article` | **Flash 3.1** | `gemini-3.1-flash-image-preview` | 高速、記事内画像に十分な品質 |

| Fallback | `gemini-2.5-flash-image` | 全モデル失敗時の最終手段 |

`--model gemini-3.1-flash-image-preview` のように明示指定でオーバーライド可能。

Auto-retry: 各モデル最大3回 → 次のモデルへフォールバック。
- hero: Pro 3 → Flash 3.1 → Flash 2.5
- article: Flash 3.1 → Pro 3 → Flash 2.5

## Generation Modes

### `hero` (default)
Full-scene cinematic thumbnail for blog cards and OGP. Dark background matching site aesthetic (#151515).

### `article`
In-article illustration. Lighter, more focused composition. Requires `--scene` to describe the desired visual.
- White/neutral background option
- Tighter framing
- No text overlay by default
- Suited for explanatory diagrams, concept illustrations, scene depictions

## Mood System

Colors auto-detected from title/description/tags/category. 6 palettes available:

| Mood | Tone | Article Type |
|------|------|-------------|
| `educational` | Blue/Cyan | 解説・技術記事 |
| `urgent` | Red/Orange | 注意喚起・速報 |
| `inspirational` | Green/Lime | 成長・挑戦系 |
| `professional` | Slate/Indigo | ビジネス系 |
| `friendly` | Amber/Rose | 日常・雑記 |
| `creative` | Red/Amber | デザイン・制作 |

Details: [references/mood-palettes.md](references/mood-palettes.md)

Override: `--mood creative`

## Workflow

### 1. Gather metadata

From user input or existing blog post frontmatter:
- **title** (required)
- **slug** (required)
- **description**, **tags**, **category** (optional, improve auto-detection)

### 2. Resolve settings

Priority: project `CLAUDE.md` → user input → defaults.

### 3. Generate (with preview)

**既存画像がある場合は `--preview` を付けて生成。** 新規の場合は直接保存で OK。

- `--preview` あり: `.preview.jpg` に保存（元画像はそのまま）
- `--preview` なし: 最終パスに直接保存

### 4. Compare & Confirm (preview 時)

プレビュー生成後:
1. Read ツールで旧画像とプレビュー画像の両方をユーザーに表示
2. ユーザーに選択を確認
3. **承認**: `mv preview.jpg original.jpg` で置き換え
4. **却下**: `rm preview.jpg` でプレビュー削除、元画像を維持
5. **再生成**: 別のムード/モデルで再度 `--preview` 実行

### 5. Update frontmatter

For hero mode: set `heroImage` in the blog post's frontmatter.
For article mode: the user manually places the `![](...)` reference in the post body.

### 6. Cleanup

プレビューファイル (`.preview.jpg`) が残っていないか確認。残っていれば削除。

## All Options

| Flag | Default | Description |
|------|---------|-------------|
| `--title` | (required) | Article title |
| `--slug` | (required) | URL slug |
| `--output` | (required) | Output file path |
| `--description` | `""` | Article summary |
| `--tags` | `""` | Comma-separated tags |
| `--category` | `tech` | `tech` / `knowledge` / `diary` |
| `--mood` | `auto` | Mood override |
| `--mode` | `hero` | `hero` / `article` |
| `--scene` | `""` | Scene description (article mode) |
| `--aspect` | `16:9` | Aspect ratio |
| `--model` | `auto` | Gemini model (auto=mode別自動選択) |
| `--keyword` | `""` | English text overlay |
| `--reference` | `""` | Reference image path |
| `--preview` | `false` | .preview.jpg に保存（既存画像を上書きしない） |
| `--batch` | - | JSON file for batch generation |

## Batch Format

```json
[
  {
    "title": "記事タイトル1",
    "slug": "slug-1",
    "output": "src/assets/img/blog/slug-1.jpg",
    "description": "説明",
    "tags": "React,TypeScript",
    "category": "tech"
  },
  {
    "title": "記事タイトル2",
    "slug": "slug-2",
    "output": "src/assets/img/blog/slug-2.jpg",
    "category": "knowledge"
  }
]
```

Each entry supports all single-mode flags. Unspecified fields use defaults.

## Usage Examples

**User**: 「この記事のサムネ作って」(blog post file open)
→ Extract title/slug/tags from frontmatter → run script with hero mode → update heroImage

**User**: 「記事内にAIの概念図を入れたい」
→ Run script with `--mode article --scene "AI neural network concept diagram"` → save to public/img/blog/ → user places `![](...)` in post

**User**: 「ブログ記事全部のサムネ一括生成して」
→ Build JSON from all posts missing heroImage → run with `--batch`

## Error Handling

- **API key missing**: Check `.env` for `GEMINI_API_KEY`
- **HTTP 429/503/500**: Auto-retry with exponential backoff
- **No image in response**: Retry up to 3 times → fallback model
- **PNG output**: Auto-convert to JPEG (requires Pillow) or save as `.png`
