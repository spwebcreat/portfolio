#!/usr/bin/env python3
"""
Blog thumbnail & article image generator using Gemini API.

Generates hero images or in-article illustrations from article metadata.
Auto-detects mood for color palette. Supports single and batch generation.

Usage (single):
  python3 generate_thumbnail.py \
    --title "記事タイトル" \
    --slug "article-slug" \
    --output "src/assets/img/blog/article-slug.jpg" \
    [--mode hero|article] [--scene "scene description"] \
    [--description "..."] [--tags "tag1,tag2"] [--category tech] \
    [--mood auto] [--model gemini-3.1-flash-image-preview] \
    [--keyword "KEYWORD"] [--reference "path/to/ref.jpg"]

Usage (batch):
  python3 generate_thumbnail.py --batch articles.json

Environment:
  GEMINI_API_KEY - Required.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

FALLBACK_FINAL = "gemini-2.5-flash-image"
MAX_RETRIES = 3

# Fallback chains by mode: primary → secondary → final
MODEL_CHAINS = {
    "hero": [
        "gemini-3-pro-image-preview",
        "gemini-3.1-flash-image-preview",
        FALLBACK_FINAL,
    ],
    "article": [
        "gemini-3.1-flash-image-preview",
        "gemini-3-pro-image-preview",
        FALLBACK_FINAL,
    ],
}


def resolve_model_chain(model_arg: str, mode: str) -> list[str]:
    """Return ordered list of models to try. Explicit model skips auto chain."""
    if model_arg != "auto":
        chain = [model_arg]
        if model_arg != FALLBACK_FINAL:
            chain.append(FALLBACK_FINAL)
        return chain
    return MODEL_CHAINS.get(mode, MODEL_CHAINS["hero"])

# ---------------------------------------------------------------------------
# Mood palettes
# ---------------------------------------------------------------------------

MOOD_PALETTES = {
    "educational": {
        "bg": "#0A1628",
        "primary": "#38BDF8",
        "secondary": "#6366F1",
        "highlight": "#FDFDFD",
        "desc": "intellectual, clear, trustworthy",
        "label": "解説・技術系",
    },
    "urgent": {
        "bg": "#1C0A0A",
        "primary": "#EF4444",
        "secondary": "#F97316",
        "highlight": "#FDFDFD",
        "desc": "bold, attention-grabbing, decisive",
        "label": "注意喚起・速報",
    },
    "inspirational": {
        "bg": "#0A1A14",
        "primary": "#34D399",
        "secondary": "#A3E635",
        "highlight": "#F0FFF8",
        "desc": "uplifting, growth-oriented, optimistic",
        "label": "成長・挑戦系",
    },
    "professional": {
        "bg": "#0F1219",
        "primary": "#94A3B8",
        "secondary": "#818CF8",
        "highlight": "#FDFDFD",
        "desc": "refined, authoritative, sophisticated",
        "label": "ビジネス・仕事系",
    },
    "friendly": {
        "bg": "#1A1408",
        "primary": "#FBBF24",
        "secondary": "#FB7185",
        "highlight": "#FFF8F0",
        "desc": "warm, approachable, playful",
        "label": "日常・雑記",
    },
    "creative": {
        "bg": "#1A0A10",
        "primary": "#E50035",
        "secondary": "#F59E0B",
        "highlight": "#FFF8F0",
        "desc": "expressive, artistic, vibrant",
        "label": "デザイン・制作",
    },
}

# ---------------------------------------------------------------------------
# Mood auto-detection
# ---------------------------------------------------------------------------

MOOD_KEYWORDS: dict[str, list[str]] = {
    "urgent": [
        "注意", "今すぐ", "速報", "限定", "危険", "セキュリティ",
        "脆弱性", "緊急", "警告", "breaking", "critical", "urgent",
    ],
    "creative": [
        "デザイン", "制作", "UI", "UX", "レイアウト", "フォント",
        "ビジュアル", "アニメーション", "CSS", "Figma", "配色",
        "design", "creative", "visual",
    ],
    "educational": [
        "解説", "方法", "入門", "使い方", "ハウツー", "仕組み",
        "チュートリアル", "学ぶ", "基礎", "実装", "構築", "自動",
        "振り分け", "設定", "導入", "how to", "tutorial", "guide",
        "API", "フィルタ", "filter",
    ],
    "professional": [
        "ビジネス", "仕事", "キャリア", "運用", "管理", "効率",
        "生産性", "マネジメント", "戦略", "business", "career",
    ],
    "inspirational": [
        "成長", "挑戦", "始め", "ポートフォリオ", "独立",
        "フリーランス", "夢", "目標", "変わ", "新しい",
        "journey", "growth", "challenge",
    ],
    "friendly": [
        "日常", "雑記", "雑談", "日記", "おすすめ", "レビュー",
        "買った", "食べ", "旅", "趣味", "初投稿", "はじめまして",
        "hello", "diary", "review",
    ],
}

MOOD_TAG_HINTS: dict[str, str] = {
    "AI": "educational", "GAS": "educational", "React": "educational",
    "Next.js": "educational", "TypeScript": "educational", "Astro": "educational",
    "Python": "educational", "Three.js": "educational", "Firebase": "educational",
    "WordPress": "educational", "Design": "creative", "Figma": "creative",
    "CSS": "creative", "UI": "creative", "UX": "creative",
}

CATEGORY_MOOD_FALLBACK = {"tech": "educational", "knowledge": "creative", "diary": "friendly"}


def detect_mood(title: str, description: str, tags: str, category: str) -> str:
    """Auto-detect article mood from content."""
    text = f"{title} {description}".lower()

    # Score-based detection (count keyword matches per mood)
    scores: dict[str, int] = {}
    for mood, keywords in MOOD_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw.lower() in text)
        if score > 0:
            scores[mood] = score

    if scores:
        return max(scores, key=scores.get)

    # Tag hints
    if tags:
        for tag in (t.strip() for t in tags.split(",")):
            if tag in MOOD_TAG_HINTS:
                return MOOD_TAG_HINTS[tag]

    return CATEGORY_MOOD_FALLBACK.get(category, "educational")


# ---------------------------------------------------------------------------
# Tag-based visual modifiers
# ---------------------------------------------------------------------------

TAG_MODIFIERS: dict[str, str] = {
    "AI": "glowing neural pathways or AI brain visualization",
    "React": "modern web UI component cards in a browser",
    "Astro": "rocket trail or starfield with fast-moving light streaks",
    "Next.js": "server infrastructure with data flowing to a browser",
    "GAS": "Google Sheets interface or automation workflow diagram",
    "CSS": "browser window with styled elements and visible code",
    "TypeScript": "code editor with TypeScript syntax highlighting",
    "Three.js": "3D rendered geometric object floating in space",
    "WordPress": "CMS dashboard or content management interface",
    "Python": "terminal showing Python code execution",
    "Firebase": "cloud database with real-time data sync visualization",
    "Figma": "design tool interface with artboards and components",
    "Design": "color swatches, typography specimens, or layout grids",
    "Docker": "container ship metaphor or modular container blocks",
    "Git": "branching tree diagram with merge points",
    "API": "interconnected endpoints with data flow arrows",
    "Database": "structured data tables with relationship connections",
    "Security": "shield or lock with digital protection elements",
    "Performance": "speedometer or benchmark graph visualization",
}


def get_tag_modifiers(tags: str, max_count: int = 2) -> list[str]:
    """Return visual modifier strings based on article tags."""
    if not tags:
        return []
    mods = []
    for tag in (t.strip() for t in tags.split(",")):
        if tag in TAG_MODIFIERS and len(mods) < max_count:
            mods.append(TAG_MODIFIERS[tag])
    return mods


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def build_prompt(
    title: str,
    description: str,
    tags: str,
    category: str,
    mood: str,
    keyword: str = "",
    mode: str = "hero",
    scene: str = "",
) -> str:
    """Build image generation prompt. Supports hero and article modes."""
    palette = MOOD_PALETTES.get(mood, MOOD_PALETTES["educational"])
    layers: list[str] = []

    if mode == "article":
        return _build_article_prompt(title, description, tags, mood, palette, scene, keyword)

    # --- Hero mode (default) ---

    # Layer 1: Role & style
    layers.append(
        "You are an expert visual designer creating a premium blog thumbnail. "
        "Create a CINEMATIC, photorealistic composition — like a high-end editorial "
        "photograph or a premium 3D render. The viewer should instantly understand "
        "the article's topic from the image alone."
    )

    # Layer 2: Color & lighting
    layers.append(
        f"COLOR & LIGHTING:\n"
        f"  Background tone: {palette['bg']}\n"
        f"  Primary accent: {palette['primary']}\n"
        f"  Secondary accent: {palette['secondary']}\n"
        f"  Highlight: {palette['highlight']}\n"
        f"Apply dramatic cinematic lighting with these hues. "
        f"The mood should feel {palette['desc']}. "
        f"Do NOT use flat color fills — use light, shadow, and atmosphere."
    )

    # Layer 3: Subject (most important)
    subject = f"SUBJECT (most important):\n  Title: {title}\n"
    if description:
        subject += f"  Summary: {description}\n"
    if tags:
        subject += f"  Topics: {tags}\n"
    subject += (
        "Depict a realistic scene or concept that directly represents this article. "
        "Use concrete, recognizable visual metaphors, not abstract shapes."
    )
    layers.append(subject)

    # Layer 4: Tag-based elements
    modifiers = get_tag_modifiers(tags)
    if modifiers:
        layers.append(
            "VISUAL ELEMENTS (integrate naturally):\n"
            + "\n".join(f"- {m}" for m in modifiers)
        )

    # Layer 5: Composition
    layers.append(
        "COMPOSITION:\n"
        "- The visual scene is the primary element\n"
        "- Use depth of field, atmospheric perspective, and cinematic framing\n"
        "- Must read clearly at both large (hero) and small (card) sizes\n"
        "- Maintain dark overall tone matching the background"
    )

    # Layer 6: Typography or no-text
    if keyword:
        layers.append(
            f'TYPOGRAPHY: Include "{keyword}" in bold modern sans-serif, '
            f"color {palette['highlight']}. Place it naturally — it should enhance, "
            f"not dominate. The visual scene remains the hero."
        )
    else:
        layers.append(
            "IMPORTANT: Generate ONLY a visual image. Do NOT include any text, "
            "letters, numbers, words, or typography."
        )

    # Layer 7: Quality
    layers.append(
        "QUALITY:\n"
        "- Photorealistic or high-quality 3D render\n"
        "- Cinematic lighting with depth\n"
        "- No flat, clipart, or stock-illustration aesthetics\n"
        "- Professional magazine cover quality"
    )

    return "\n\n".join(layers)


def _build_article_prompt(
    title: str,
    description: str,
    tags: str,
    mood: str,
    palette: dict,
    scene: str,
    keyword: str = "",
) -> str:
    """Build prompt for in-article illustration mode."""
    layers: list[str] = []

    layers.append(
        "You are an expert illustrator creating an in-article image for a tech blog. "
        "Create a clean, focused illustration that explains or visualizes a concept. "
        "This is NOT a hero banner — it's an explanatory image within the article body."
    )

    layers.append(
        f"STYLE:\n"
        f"  Accent color: {palette['primary']}\n"
        f"  Secondary: {palette['secondary']}\n"
        f"Use a clean, slightly dark background (#1a1a2e or similar). "
        f"The image should be informative and visually clear, with good contrast."
    )

    if scene:
        layers.append(f"SCENE (primary direction):\n{scene}")
    else:
        subject = f"CONTEXT:\n  Article: {title}\n"
        if description:
            subject += f"  About: {description}\n"
        subject += "Create a visual that supports this article's content."
        layers.append(subject)

    modifiers = get_tag_modifiers(tags)
    if modifiers:
        layers.append("ELEMENTS:\n" + "\n".join(f"- {m}" for m in modifiers))

    if keyword:
        layers.append(
            f'Include the label "{keyword}" as clean, readable text in the image.'
        )
    else:
        layers.append("Do NOT include any text in the image.")

    layers.append(
        "QUALITY:\n"
        "- Clean, professional illustration or photorealistic render\n"
        "- Tighter framing than a banner — focused on the concept\n"
        "- Must be clear at medium size (~800px wide)\n"
        "- Informative and visually engaging"
    )

    return "\n\n".join(layers)


# ---------------------------------------------------------------------------
# Gemini API
# ---------------------------------------------------------------------------

def _load_reference_image(path: str) -> dict | None:
    """Load a reference image as Gemini API inline_data part."""
    if not path or not os.path.exists(path):
        return None
    ext = os.path.splitext(path)[1].lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    mime_type = mime_map.get(ext, "image/jpeg")
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")
    return {"inlineData": {"mimeType": mime_type, "data": data}}


def _call_gemini(api_key: str, prompt: str, model: str, reference_part: dict | None = None) -> dict | None:
    """Make a single Gemini API call. Returns parsed JSON or None on transient failure."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    parts: list[dict] = []
    if reference_part:
        parts.append(reference_part)
    parts.append({"text": prompt})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["Text", "Image"]},
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{url}?key={api_key}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        code = e.code
        print(f"  API error: HTTP {code}", file=sys.stderr)
        if code in (503, 429, 500):
            return None
        print(f"  Response: {body}", file=sys.stderr)
        sys.exit(1)
    except (urllib.error.URLError, OSError) as e:
        reason = getattr(e, "reason", str(e))
        print(f"  Connection error: {reason}", file=sys.stderr)
        return None


def _extract_image(result: dict) -> bytes | None:
    """Extract image bytes from Gemini API response."""
    candidates = result.get("candidates", [])
    if not candidates:
        return None
    parts = candidates[0].get("content", {}).get("parts", [])
    for part in parts:
        inline_data = part.get("inlineData") or part.get("inline_data")
        if inline_data and "data" in inline_data:
            return base64.b64decode(inline_data["data"])
    return None


def generate_image(
    api_key: str,
    prompt: str,
    model_chain: list[str],
    reference_part: dict | None = None,
) -> bytes:
    """Call Gemini API with retry + model chain fallback.

    Tries each model in the chain up to MAX_RETRIES times before
    moving to the next model.
    """
    for chain_idx, model in enumerate(model_chain):
        is_last = chain_idx == len(model_chain) - 1
        label = "Primary" if chain_idx == 0 else f"Fallback #{chain_idx}"
        print(f"\n[{label}] Using {model}")

        for attempt in range(1, MAX_RETRIES + 1):
            print(f"  [{attempt}/{MAX_RETRIES}] Calling {model}...")
            result = _call_gemini(api_key, prompt, model, reference_part)
            if result is not None:
                image_bytes = _extract_image(result)
                if image_bytes:
                    if chain_idx > 0:
                        print(f"  Success with fallback: {model}")
                    return image_bytes
                print("  No image in response.", file=sys.stderr)
                for part in result.get("candidates", [{}])[0].get("content", {}).get("parts", []):
                    if "text" in part:
                        print(f"  Text: {part['text'][:200]}", file=sys.stderr)

            if attempt < MAX_RETRIES:
                wait = 5 * attempt
                print(f"  Retrying in {wait}s...", file=sys.stderr)
                time.sleep(wait)

        if not is_last:
            print(f"  {model} failed after {MAX_RETRIES} attempts.", file=sys.stderr)

    print("Error: All models in chain failed.", file=sys.stderr)
    sys.exit(1)


def save_image(image_bytes: bytes, output_path: str) -> str:
    """Save image bytes, converting PNG→JPEG if needed. Returns actual saved path."""
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    is_png = image_bytes[:8] == b'\x89PNG\r\n\x1a\n'
    wants_jpeg = output_path.lower().endswith((".jpg", ".jpeg"))

    if wants_jpeg and is_png:
        try:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img.save(output_path, "JPEG", quality=90)
            print(f"Saved (PNG→JPEG): {output_path}")
            return output_path
        except ImportError:
            alt_path = output_path.rsplit(".", 1)[0] + ".png"
            with open(alt_path, "wb") as f:
                f.write(image_bytes)
            print(f"Warning: Pillow not installed. Saved as: {alt_path}", file=sys.stderr)
            print(f"  Install: pip3 install Pillow", file=sys.stderr)
            return alt_path

    with open(output_path, "wb") as f:
        f.write(image_bytes)
    print(f"Saved: {output_path}")
    return output_path


# ---------------------------------------------------------------------------
# Batch mode
# ---------------------------------------------------------------------------

def run_batch(batch_file: str, api_key: str) -> None:
    """Process multiple articles from a JSON file."""
    with open(batch_file) as f:
        articles = json.load(f)

    if not isinstance(articles, list):
        print("Error: Batch file must contain a JSON array.", file=sys.stderr)
        sys.exit(1)

    total = len(articles)
    success = 0
    failed = 0

    for i, article in enumerate(articles, 1):
        title = article.get("title", "")
        slug = article.get("slug", "")
        output = article.get("output", "")

        if not title or not slug or not output:
            print(f"[{i}/{total}] Skipping: missing title, slug, or output", file=sys.stderr)
            failed += 1
            continue

        print(f"\n{'='*60}")
        print(f"[{i}/{total}] {title}")
        print(f"{'='*60}")

        description = article.get("description", "")
        tags = article.get("tags", "")
        category = article.get("category", "tech")
        mood_input = article.get("mood", "auto")
        mode = article.get("mode", "hero")
        scene = article.get("scene", "")
        keyword = article.get("keyword", "")
        reference = article.get("reference", "")
        model_input = article.get("model", "auto")
        model_chain = resolve_model_chain(model_input, mode)

        # Resolve mood
        if mood_input == "auto":
            mood = detect_mood(title, description, tags, category)
        elif mood_input in MOOD_PALETTES:
            mood = mood_input
        else:
            mood = detect_mood(title, description, tags, category)

        palette = MOOD_PALETTES[mood]
        print(f"  Mood: {mood} ({palette['label']})")

        prompt = build_prompt(title, description, tags, category, mood, keyword, mode, scene)

        reference_part = None
        if reference:
            reference_part = _load_reference_image(reference)
            if reference_part:
                prompt += (
                    "\n\nREFERENCE IMAGE: Use this image as visual inspiration — "
                    "incorporate its style, color scheme, and aesthetic."
                )

        try:
            image_bytes = generate_image(api_key, prompt, model_chain, reference_part)
            save_image(image_bytes, output)
            success += 1
        except SystemExit:
            print(f"  Failed to generate: {title}", file=sys.stderr)
            failed += 1
            continue

        # Brief delay between batch items to avoid rate limits
        if i < total:
            time.sleep(2)

    print(f"\n{'='*60}")
    print(f"Batch complete: {success}/{total} succeeded, {failed} failed")
    print(f"{'='*60}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate blog images using Gemini API")

    # Batch mode
    parser.add_argument("--batch", help="JSON file for batch generation")

    # Single mode
    parser.add_argument("--title", help="Article title")
    parser.add_argument("--slug", help="Article slug")
    parser.add_argument("--output", help="Output file path")
    parser.add_argument("--description", default="", help="Article description")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("--category", default="tech", choices=["tech", "knowledge", "diary"])
    parser.add_argument("--mood", default="auto", help="Color mood (auto, educational, urgent, inspirational, professional, friendly, creative)")
    parser.add_argument("--mode", default="hero", choices=["hero", "article"], help="Image mode")
    parser.add_argument("--scene", default="", help="Scene description (article mode)")
    parser.add_argument("--aspect", default="16:9", help="Aspect ratio")
    parser.add_argument("--model", default="auto", help="Gemini model (default: auto — hero=Pro 3, article=Flash 3.1)")
    parser.add_argument("--keyword", default="", help="English keyword text overlay")
    parser.add_argument("--reference", default="", help="Reference image path")
    parser.add_argument("--preview", action="store_true", help="Save to .preview.jpg instead of overwriting")

    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not set", file=sys.stderr)
        sys.exit(1)

    # Batch mode
    if args.batch:
        run_batch(args.batch, api_key)
        return

    # Single mode validation
    if not args.title or not args.slug or not args.output:
        print("Error: --title, --slug, and --output are required (or use --batch)", file=sys.stderr)
        sys.exit(1)

    # Resolve mood
    if args.mood == "auto":
        mood = detect_mood(args.title, args.description, args.tags, args.category)
    elif args.mood in MOOD_PALETTES:
        mood = args.mood
    else:
        print(f"Warning: Unknown mood '{args.mood}'. Using auto.", file=sys.stderr)
        mood = detect_mood(args.title, args.description, args.tags, args.category)

    model_chain = resolve_model_chain(args.model, args.mode)
    palette = MOOD_PALETTES[mood]
    print(f"Model chain: {' → '.join(model_chain)}")
    print(f"Mode: {args.mode}")
    print(f"Mood: {mood} ({palette['label']})")
    print(f"Palette: bg={palette['bg']} primary={palette['primary']} secondary={palette['secondary']}")

    prompt = build_prompt(
        args.title, args.description, args.tags, args.category,
        mood, args.keyword, args.mode, args.scene,
    )

    # Reference image
    reference_part = None
    if args.reference:
        reference_part = _load_reference_image(args.reference)
        if reference_part:
            print(f"Reference: {args.reference}")
            prompt += (
                "\n\nREFERENCE IMAGE: Use this image as visual inspiration — "
                "incorporate its style, color scheme, and aesthetic."
            )
        else:
            print(f"Warning: Reference not found: {args.reference}", file=sys.stderr)

    print(f"Generating: {args.title}")
    print(f"Prompt:\n{prompt}\n")

    # Determine output path (preview or final)
    if args.preview:
        base, ext = os.path.splitext(args.output)
        preview_path = f"{base}.preview{ext}"
        actual_output = preview_path
    else:
        actual_output = args.output

    image_bytes = generate_image(api_key, prompt, model_chain, reference_part)
    saved_path = save_image(image_bytes, actual_output)

    if args.preview:
        print(f"PREVIEW_PATH={saved_path}")
        print(f"ORIGINAL_PATH={args.output}")
        print("Preview saved. Compare and decide:")
        print(f"  Accept: mv '{saved_path}' '{args.output}'")
        print(f"  Reject: rm '{saved_path}'")
    else:
        print(f"OUTPUT_PATH={saved_path}")

    print("Done!")


if __name__ == "__main__":
    main()
