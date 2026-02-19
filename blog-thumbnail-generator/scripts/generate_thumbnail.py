#!/usr/bin/env python3
"""
Blog thumbnail generator using Gemini API.
Generates a hero image from article title, description, and tags.
Auto-detects article mood for color palette, uses article content
to drive realistic visual subject matter.

Usage:
  python3 generate_thumbnail.py \
    --title "記事タイトル" \
    --slug "article-slug" \
    --output "src/assets/img/blog/article-slug.jpg" \
    [--description "記事の説明"] \
    [--tags "tag1,tag2"] \
    [--category "tech|knowledge|diary"] \
    [--mood "auto"] \
    [--aspect "16:9"] \
    [--model "gemini-3-pro-image-preview"] \
    [--keyword "KEYWORD"]

Environment:
  GEMINI_API_KEY - Required. Gemini API key.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# Mood-based color palettes
# ---------------------------------------------------------------------------
# Inspired by: https://note.com/naoki_35/n/nfd7fea56b151
# Colors chosen to match the article's tone/mood.
# All backgrounds are dark but with distinct hues to stand out from
# the site background (#151515).

MOOD_PALETTES = {
    "educational": {
        "background": "#0A1628",
        "primary": "#38BDF8",
        "secondary": "#6366F1",
        "highlight": "#FDFDFD",
        "mood_desc": "intellectual, clear, trustworthy, structured",
        "label": "解説・ハウツー系",
    },
    "urgent": {
        "background": "#1C0A0A",
        "primary": "#EF4444",
        "secondary": "#F97316",
        "highlight": "#FDFDFD",
        "mood_desc": "bold, attention-grabbing, high-energy, decisive",
        "label": "注意喚起・速報・重要系",
    },
    "inspirational": {
        "background": "#0A1A14",
        "primary": "#34D399",
        "secondary": "#A3E635",
        "highlight": "#F0FFF8",
        "mood_desc": "uplifting, fresh, growth-oriented, optimistic",
        "label": "やる気・成長・挑戦系",
    },
    "professional": {
        "background": "#0F1219",
        "primary": "#94A3B8",
        "secondary": "#818CF8",
        "highlight": "#FDFDFD",
        "mood_desc": "refined, authoritative, sophisticated, restrained",
        "label": "ビジネス・仕事系",
    },
    "friendly": {
        "background": "#1A1408",
        "primary": "#FBBF24",
        "secondary": "#FB7185",
        "highlight": "#FFF8F0",
        "mood_desc": "warm, approachable, casual, playful",
        "label": "雑談・日常・エンタメ系",
    },
    "creative": {
        "background": "#1A0A10",
        "primary": "#E50035",
        "secondary": "#F59E0B",
        "highlight": "#FFF8F0",
        "mood_desc": "expressive, artistic, crafted, vibrant",
        "label": "デザイン・制作・クリエイティブ系",
    },
}

# ---------------------------------------------------------------------------
# Mood auto-detection
# ---------------------------------------------------------------------------

MOOD_KEYWORDS = {
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

MOOD_TAG_HINTS = {
    "AI": "educational",
    "GAS": "educational",
    "React": "educational",
    "Next.js": "educational",
    "TypeScript": "educational",
    "Astro": "educational",
    "Python": "educational",
    "Three.js": "educational",
    "Firebase": "educational",
    "WordPress": "educational",
    "Design": "creative",
    "Figma": "creative",
    "CSS": "creative",
    "UI": "creative",
    "UX": "creative",
}

CATEGORY_MOOD_FALLBACK = {
    "tech": "educational",
    "knowledge": "creative",
    "diary": "friendly",
}


def detect_mood(title: str, description: str, tags: str, category: str) -> str:
    """Auto-detect article mood from title, description, tags, and category."""
    text = f"{title} {description}".lower()

    for mood, keywords in MOOD_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text:
                return mood

    if tags:
        tag_list = [t.strip() for t in tags.split(",")]
        for tag in tag_list:
            if tag in MOOD_TAG_HINTS:
                return MOOD_TAG_HINTS[tag]

    return CATEGORY_MOOD_FALLBACK.get(category, "educational")


# ---------------------------------------------------------------------------
# Tag-based visual modifiers (realistic versions)
# ---------------------------------------------------------------------------

TAG_MODIFIERS = {
    "AI": "Include a realistic depiction of AI concepts: a glowing digital brain, neural pathways, or machine learning data visualization.",
    "React": "Include realistic UI component cards or a browser window showing a modern web interface.",
    "Astro": "Include a realistic rocket launch trail or a starfield with fast-moving light streaks.",
    "Next.js": "Include a realistic server rack or cloud infrastructure visual with data flowing to a browser.",
    "GAS": "Include a realistic Google Sheets spreadsheet interface or automation workflow diagram.",
    "CSS": "Include a realistic browser window showing styled web elements with visible code.",
    "TypeScript": "Include a realistic code editor interface with TypeScript syntax highlighting.",
    "Three.js": "Include a realistic 3D rendered object (geometric shape, product model) floating in space.",
    "WordPress": "Include a realistic CMS dashboard or content management interface.",
    "Python": "Include a realistic terminal or code editor showing Python code execution.",
    "Firebase": "Include a realistic cloud database or real-time data sync visualization.",
    "Figma": "Include a realistic design tool interface with artboards and design components.",
    "Design": "Include realistic design tools: color swatches, typography specimens, or layout grids.",
}

DEFAULT_MODEL = "gemini-3-pro-image-preview"


def get_tag_modifiers(tags: str, max_count: int = 2) -> list[str]:
    """Return up to max_count visual modifier strings based on article tags."""
    if not tags:
        return []
    modifiers = []
    for tag in (t.strip() for t in tags.split(",")):
        if tag in TAG_MODIFIERS and len(modifiers) < max_count:
            modifiers.append(TAG_MODIFIERS[tag])
    return modifiers


def build_prompt(
    title: str,
    description: str,
    tags: str,
    category: str,
    mood: str,
    keyword: str = "",
) -> str:
    """Build a content-driven, realistic image generation prompt."""
    palette = MOOD_PALETTES.get(mood, MOOD_PALETTES["educational"])

    layers = []

    # Layer 1: Role + realistic style direction
    layers.append(
        "You are an expert graphic designer creating a premium blog thumbnail image. "
        "Create a REALISTIC, cinematic composition — like a high-end editorial photograph "
        "or a photorealistic 3D render. The image should visually represent the article's "
        "subject matter so viewers instantly understand what the article is about. "
        "Aim for the quality of a professional magazine cover or a premium stock photo."
    )

    # Layer 2: Mood-based color palette as lighting/atmosphere
    layers.append(
        f"COLOR & LIGHTING:\n"
        f"  Dominant background tone: {palette['background']}\n"
        f"  Primary light/accent color: {palette['primary']}\n"
        f"  Secondary light/accent color: {palette['secondary']}\n"
        f"  Highlight color: {palette['highlight']}\n"
        f"Use these colors as the lighting and atmosphere of the scene. "
        f"The mood should feel {palette['mood_desc']}. "
        f"Apply dramatic, cinematic lighting with these hues — not flat color fills."
    )

    # Layer 3: Content-driven subject matter
    layers.append(
        f"SUBJECT MATTER (this is the most important layer):\n"
        f"  Article title: {title}\n"
        + (f"  Article summary: {description}\n" if description else "")
        + (f"  Related topics: {tags}\n" if tags else "")
        + "Depict a realistic scene, object, or concept that directly represents "
        "this article's topic. The viewer should be able to guess the article's "
        "subject just from the image. Use concrete, recognizable visual metaphors "
        "rather than abstract shapes."
    )

    # Layer 4: Tag-based realistic elements
    modifiers = get_tag_modifiers(tags)
    if modifiers:
        layers.append(
            "VISUAL ELEMENTS (integrate naturally into the scene):\n"
            + "\n".join(f"- {m}" for m in modifiers)
        )

    # Layer 5: Composition priority
    layers.append(
        "COMPOSITION: The VISUAL SCENE is the primary element. "
        "The image should tell a story or set a mood through realistic imagery. "
        "Use depth of field, atmospheric perspective, and cinematic framing."
    )

    # Layer 6: Keyword handling
    if keyword:
        layers.append(
            f'TYPOGRAPHY (secondary element):\n'
            f'Include the English keyword "{keyword}" in the image using bold, modern '
            f"sans-serif typography in {palette['highlight']} color. "
            "Place it where it integrates naturally into the composition — "
            "it should enhance the visual, not dominate it. "
            "Keep it readable but let the realistic scene be the hero."
        )
    else:
        layers.append(
            "IMPORTANT: Generate ONLY a visual image. Do NOT include any text, "
            "letters, numbers, words, or typography in the image. The image should be "
            "purely visual."
        )

    # Layer 7: Quality constraints
    layers.append(
        "QUALITY CONSTRAINTS:\n"
        "- Photorealistic or high-quality 3D render aesthetic.\n"
        "- Cinematic lighting with depth and atmosphere.\n"
        "- The image must read clearly at both large (hero) and small (card thumbnail) sizes.\n"
        "- Avoid flat, clipart-like, or stock-illustration aesthetics.\n"
        "- Maintain a dark overall tone matching the background color."
    )

    if keyword:
        layers.append(
            f'FINAL REMINDER: The keyword "{keyword}" should appear as readable English '
            "text, but the REALISTIC VISUAL SCENE must be the star of the image."
        )

    return "\n\n".join(layers)


FALLBACK_MODEL = "gemini-2.5-flash-image"
MAX_RETRIES = 3


def _call_gemini(api_key: str, prompt: str, model: str) -> dict | None:
    """Make a single Gemini API call. Returns parsed JSON or None on transient failure."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["Text", "Image"],
        },
    }

    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        f"{url}?key={api_key}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        code = e.code
        print(f"  API error: HTTP {code}", file=sys.stderr)
        # 503 / 429 are transient; others are fatal
        if code in (503, 429):
            return None
        print(f"  Response: {body}", file=sys.stderr)
        sys.exit(1)
    except (urllib.error.URLError, OSError) as e:
        reason = getattr(e, "reason", str(e))
        print(f"  Connection error: {reason}", file=sys.stderr)
        return None


def _extract_image(result: dict) -> bytes | None:
    """Extract image bytes from Gemini API response. Returns None if no image found."""
    candidates = result.get("candidates", [])
    if not candidates:
        return None

    parts = candidates[0].get("content", {}).get("parts", [])
    for part in parts:
        inline_data = part.get("inlineData") or part.get("inline_data")
        if inline_data and "data" in inline_data:
            return base64.b64decode(inline_data["data"])
    return None


def generate_image(api_key: str, prompt: str, model: str, aspect: str) -> bytes:
    """Call Gemini API with retry + fallback.

    Tries the requested model up to MAX_RETRIES times. On repeated failure,
    falls back to FALLBACK_MODEL (flash) for one final attempt.
    """

    # --- Try primary model up to MAX_RETRIES times ---
    for attempt in range(1, MAX_RETRIES + 1):
        print(f"[Attempt {attempt}/{MAX_RETRIES}] Calling {model}...")
        result = _call_gemini(api_key, prompt, model)
        if result is not None:
            image_bytes = _extract_image(result)
            if image_bytes:
                return image_bytes
            # Got a response but no image
            print("  No image data in response.", file=sys.stderr)
            for part in result.get("candidates", [{}])[0].get("content", {}).get("parts", []):
                if "text" in part:
                    print(f"  Text: {part['text']}", file=sys.stderr)

        if attempt < MAX_RETRIES:
            wait = 5 * attempt
            print(f"  Retrying in {wait}s...", file=sys.stderr)
            time.sleep(wait)

    # --- Fallback to flash model ---
    if model != FALLBACK_MODEL:
        print(f"\n{model} failed {MAX_RETRIES} times. Falling back to {FALLBACK_MODEL}...", file=sys.stderr)
        result = _call_gemini(api_key, prompt, FALLBACK_MODEL)
        if result is not None:
            image_bytes = _extract_image(result)
            if image_bytes:
                print(f"  Success with fallback model {FALLBACK_MODEL}.")
                return image_bytes

    print("Error: All attempts failed. Could not generate image.", file=sys.stderr)
    sys.exit(1)


def save_image(image_bytes: bytes, output_path: str) -> None:
    """Save image bytes to file, converting to JPEG if needed."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Check if it's PNG (Gemini often returns PNG)
    is_png = image_bytes[:8] == b'\x89PNG\r\n\x1a\n'

    if output_path.endswith(".jpg") or output_path.endswith(".jpeg"):
        if is_png:
            try:
                from PIL import Image
                import io
                img = Image.open(io.BytesIO(image_bytes))
                img = img.convert("RGB")
                img.save(output_path, "JPEG", quality=90)
                print(f"Saved (PNG -> JPEG converted): {output_path}")
                return
            except ImportError:
                # Pillow not available, save as PNG with .png extension
                alt_path = output_path.rsplit(".", 1)[0] + ".png"
                with open(alt_path, "wb") as f:
                    f.write(image_bytes)
                print(f"Warning: Pillow not installed. Saved as PNG: {alt_path}", file=sys.stderr)
                print(f"Install Pillow for JPEG conversion: pip3 install Pillow", file=sys.stderr)
                print(f"OUTPUT_PATH={alt_path}")
                return

    with open(output_path, "wb") as f:
        f.write(image_bytes)
    print(f"Saved: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Generate blog thumbnail using Gemini API"
    )
    parser.add_argument("--title", required=True, help="Article title")
    parser.add_argument("--slug", required=True, help="Article slug (for filename)")
    parser.add_argument("--output", required=True, help="Output file path")
    parser.add_argument("--description", default="", help="Article description")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument(
        "--category",
        default="tech",
        choices=["tech", "knowledge", "diary"],
        help="Article category",
    )
    parser.add_argument(
        "--mood",
        default="auto",
        help=(
            'Color mood: "auto" (default, detected from content), or explicit: '
            "educational, urgent, inspirational, professional, friendly, creative"
        ),
    )
    parser.add_argument(
        "--aspect", default="16:9", help="Aspect ratio (e.g., 16:9, 4:3, 1:1)"
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Gemini model (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--keyword",
        default="",
        help="English keyword to display prominently in the image",
    )
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print(
            "Error: GEMINI_API_KEY environment variable is not set", file=sys.stderr
        )
        sys.exit(1)

    # Resolve mood
    if args.mood == "auto":
        mood = detect_mood(args.title, args.description, args.tags, args.category)
    elif args.mood in MOOD_PALETTES:
        mood = args.mood
    else:
        print(f"Warning: Unknown mood '{args.mood}'. Using auto-detection.", file=sys.stderr)
        mood = detect_mood(args.title, args.description, args.tags, args.category)

    prompt = build_prompt(
        args.title,
        args.description,
        args.tags,
        args.category,
        mood,
        args.keyword,
    )

    palette = MOOD_PALETTES[mood]
    print(f"Model: {args.model}")
    print(f"Category: {args.category}")
    print(f"Mood: {mood} ({palette['label']})")
    print(f"Palette: bg={palette['background']} primary={palette['primary']} secondary={palette['secondary']}")
    print(f"Generating thumbnail for: {args.title}")
    print(f"Prompt:\n{prompt}\n")

    image_bytes = generate_image(api_key, prompt, args.model, args.aspect)
    save_image(image_bytes, args.output)
    print("Done!")


if __name__ == "__main__":
    main()
