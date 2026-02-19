---
name: blog-thumbnail-generator
description: Generate blog thumbnail/hero images using the Gemini API. Use when the user asks to create a thumbnail, hero image, or OG image for a blog article. Triggers on requests like "サムネイル生成", "サムネ作って", "ブログ画像生成", "generate thumbnail", "create hero image", or when creating a new blog post that needs a hero image.
---

# Blog Thumbnail Generator

Generate blog hero images from article metadata using the Gemini API's image generation models.

## Requirements

- `GEMINI_API_KEY` in the project's `.env` file
- Python 3 (standard library only; Pillow optional for PNG→JPEG conversion)

## Project-Specific Configuration

**Before running, check the project's `CLAUDE.md` for a `サムネイル生成設定` section.** If present, use those values as defaults instead of asking the user. Typical project-level overrides:

- `aspect`: Fixed aspect ratio (e.g., `4:3`)
- `style`: Default visual style
- `model`: Preferred Gemini model
- `output_dir`: Image output directory
- `heroImage_path`: Frontmatter path template for heroImage
- `prompt_instructions`: Additional prompt guidance for visual consistency

If no project-level config exists, fall back to the defaults below and ask the user.

## Workflow

### 1. Gather article metadata

Collect from the user or extract from an existing blog post file:

- **title** (required): Article title
- **slug** (required): URL slug / filename
- **description**: Article summary
- **tags**: Comma-separated tags
- **category**: `tech` or `works`

### 2. Resolve settings

Apply in order: project `CLAUDE.md` overrides → user input → skill defaults.

**Style options:**

| Style | Description |
|-------|-------------|
| `minimal` | Clean dark background with geometric accents |
| `gradient` | Deep dark gradient with vibrant accents |
| `abstract` | Bold shapes, flowing forms, geometric patterns |
| `tech` | Circuit-like patterns, digital aesthetics |

**Model options:**

| Model | Characteristics |
|-------|----------------|
| `gemini-2.5-flash-image` | Fast, cost-effective |
| `gemini-3-pro-image-preview` | Higher quality, more detailed (default) |

### 3. Generate the image

Load the API key from `.env` and run the script:

```bash
export GEMINI_API_KEY=$(grep GEMINI_API_KEY .env | cut -d= -f2)
python3 ~/.claude/skills/blog-thumbnail-generator/scripts/generate_thumbnail.py \
  --title "記事タイトル" \
  --slug "article-slug" \
  --output "path/to/output.jpg" \
  --description "記事の説明" \
  --tags "tag1,tag2" \
  --category "tech" \
  --style "minimal" \
  --model "gemini-2.5-flash-image"
```

### 4. Update frontmatter

If the blog post file exists, set `heroImage` to the path specified by project config.

### 5. Verify the result

Read the generated image file to show the user. If unsatisfactory, re-run with different style or model.
