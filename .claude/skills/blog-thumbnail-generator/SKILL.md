---
name: blog-thumbnail-generator
description: Generate blog thumbnail/hero images using the Gemini API. Use when the user asks to create a thumbnail, hero image, or OG image for a blog article. Triggers on requests like "サムネイル生成", "サムネ作って", "ブログ画像生成", "generate thumbnail", "create hero image", or when creating a new blog post that needs a hero image.
---

# Blog Thumbnail Generator

Generate blog hero images from article metadata using the Gemini API's image generation models. Automatically detects article mood from content to apply matching color palettes.

## Requirements

- `GEMINI_API_KEY` in the project's `.env` file
- Python 3 (standard library only; Pillow optional for PNG→JPEG conversion)

## Project-Specific Configuration

**Before running, check the project's `CLAUDE.md` for a `サムネイル生成設定` section.** If present, use those values as defaults instead of asking the user. Typical project-level overrides:

- `aspect`: Fixed aspect ratio (e.g., `4:3`)
- `style`: Default visual style (default: `auto`)
- `mood`: Default mood (default: `auto`)
- `model`: Preferred Gemini model
- `output_dir`: Image output directory
- `heroImage_path`: Frontmatter path template for heroImage

If no project-level config exists, fall back to the defaults below and ask the user.

## Mood-Based Color Palettes

Colors are automatically selected based on the article's **mood/tone**, detected from title, description, and tags:

| Mood | Colors | Use Case |
|------|--------|----------|
| `educational` | Blue / Cyan / Indigo | 解説・ハウツー・技術記事 |
| `urgent` | Red / Orange | 注意喚起・速報・重要系 |
| `inspirational` | Green / Lime | やる気・成長・挑戦系 |
| `professional` | Slate / Indigo | ビジネス・仕事・キャリア系 |
| `friendly` | Amber / Rose | 雑談・日常・エンタメ系 |
| `creative` | Red / Amber | デザイン・制作・クリエイティブ系 |

**Auto-detection priority**: Title/description keywords → Tag hints → Category fallback.

Override with `--mood educational` etc. if auto-detection is wrong.

## Visual Style

The image style is **realistic and content-driven**. The script reads the article's title, description, and tags to generate a visual scene that directly represents the article's subject matter — like a cinematic photograph or photorealistic 3D render. Viewers should be able to guess the article's topic just from the image.

The mood palette is applied as **cinematic lighting and atmosphere**, not as flat color fills.

## Workflow

### 1. Gather article metadata

Collect from the user or extract from an existing blog post file:

- **title** (required): Article title
- **slug** (required): URL slug / filename
- **description**: Article summary
- **tags**: Comma-separated tags
- **category**: `tech`, `knowledge`, or `diary`

### 2. Resolve settings

Apply in order: project `CLAUDE.md` overrides → user input → skill defaults.

**Mood is `auto` by default** — the script automatically detects the article's tone and selects a matching color palette. Visual subject matter is always derived from the article content. You only need `--mood` if the auto-detected color mood is wrong.

**Model options:**

| Model | Characteristics |
|-------|----------------|
| `gemini-2.5-flash-image` | Fast, cost-effective (fallback) |
| `gemini-3-pro-image-preview` | Higher quality, more detailed (default) |

**Auto-retry & fallback:** The script automatically retries the pro model up to 3 times (with increasing wait). If all 3 attempts fail, it falls back to the flash model. No manual `--model` switching needed.

### 3. Generate the image

Load the API key from `.env` and run the script:

```bash
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env | cut -d= -f2)
python3 .claude/skills/blog-thumbnail-generator/scripts/generate_thumbnail.py \
  --title "記事タイトル" \
  --slug "article-slug" \
  --output "path/to/output.jpg" \
  --description "記事の説明" \
  --tags "tag1,tag2" \
  --category "tech" \
  --mood "auto" \
  --model "gemini-3-pro-image-preview" \
  --reference "path/to/reference-image.jpg"
```

**`--reference` (optional):** Path to a reference image (logo, brand asset, design template). When provided, the generated thumbnail will incorporate the reference image's style, color scheme, and visual motifs. Useful for maintaining brand consistency across thumbnails.

### 4. Update frontmatter

If the blog post file exists, set `heroImage` to the path specified by project config.

### 5. Verify the result

Read the generated image file to show the user. If unsatisfactory, try:
- Different mood: `--mood creative`, `--mood urgent`, etc.
- Different model: `--model gemini-2.5-flash-image`
- Reference image for brand consistency: `--reference src/assets/img/noimage.jpg`
