#!/usr/bin/env python3
"""
Blog thumbnail generator using Gemini API.
Generates a hero image from article title, description, and tags.

Usage:
  python3 generate_thumbnail.py \
    --title "記事タイトル" \
    --slug "article-slug" \
    --output "src/assets/img/blog/article-slug.jpg" \
    [--description "記事の説明"] \
    [--tags "tag1,tag2"] \
    [--category "tech|works"] \
    [--style "minimal"] \
    [--aspect "16:9"] \
    [--model "gemini-2.5-flash-image"]

Environment:
  GEMINI_API_KEY - Required. Gemini API key.
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
import urllib.error

STYLES = {
    "minimal": (
        "Create a clean, minimal blog thumbnail image. "
        "Use a dark background (#151515) with subtle geometric accents. "
        "The design should be modern, professional, and tech-oriented. "
        "Include a subtle red accent color (#E50035). "
        "Do NOT include any text or letters in the image. "
        "The image should work well as a hero image for a blog article."
    ),
    "gradient": (
        "Create a blog thumbnail with a beautiful gradient background. "
        "Use deep dark tones transitioning to vibrant accent colors. "
        "The design should feel modern, abstract, and eye-catching. "
        "Include subtle red (#E50035) as an accent color. "
        "Do NOT include any text or letters in the image. "
        "The image should work well as a hero image for a blog article."
    ),
    "abstract": (
        "Create an abstract, artistic blog thumbnail image. "
        "Use bold shapes, flowing forms, or geometric patterns. "
        "Dark background with vibrant highlight colors including red (#E50035). "
        "The design should feel creative and contemporary. "
        "Do NOT include any text or letters in the image. "
        "The image should work well as a hero image for a blog article."
    ),
    "tech": (
        "Create a technology-themed blog thumbnail image. "
        "Use circuit-like patterns, code-inspired visuals, or digital aesthetics. "
        "Dark background (#151515) with glowing accents in red (#E50035) and blue. "
        "The design should feel cutting-edge and developer-oriented. "
        "Do NOT include any text or letters in the image. "
        "The image should work well as a hero image for a blog article."
    ),
}

DEFAULT_MODEL = "gemini-3-pro-image-preview"


def build_prompt(title: str, description: str, tags: str, category: str, style: str, keyword: str = "") -> str:
    """Build the image generation prompt from article metadata."""
    style_instruction = STYLES.get(style, STYLES["minimal"])

    prompt_parts = [style_instruction]

    if keyword:
        prompt_parts.append(
            f'\nPlace the English keyword "{keyword}" prominently and large in the center of the image. '
            "Use bold, modern typography. This text should be the focal point of the design."
        )

    prompt_parts.append(f"\nThe blog article topic is: {title}")

    if description:
        prompt_parts.append(f"Article summary: {description}")

    if tags:
        prompt_parts.append(f"Related topics: {tags}")

    if category == "works" or category == "knowledge":
        prompt_parts.append(
            "The article is about web design/development work and client projects."
        )
    else:
        prompt_parts.append(
            "The article is about technology, programming, and development tips."
        )

    if keyword:
        prompt_parts.append(
            f'\nIMPORTANT: The keyword "{keyword}" MUST appear as readable English text in the image. '
            "Make it large and prominent. All other visual elements should complement this text."
        )
    else:
        prompt_parts.append(
            "\nIMPORTANT: Generate ONLY an image. Do NOT include any text, letters, "
            "numbers, words, or typography in the image. The image should be purely visual/graphical."
        )

    return "\n".join(prompt_parts)


def generate_image(api_key: str, prompt: str, model: str, aspect: str) -> bytes:
    """Call Gemini API to generate an image and return raw image bytes."""
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
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"Error: Gemini API returned HTTP {e.code}", file=sys.stderr)
        print(f"Response: {body}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Error: Failed to connect to Gemini API: {e.reason}", file=sys.stderr)
        sys.exit(1)

    # Extract image data from response
    candidates = result.get("candidates", [])
    if not candidates:
        print("Error: No candidates in API response", file=sys.stderr)
        print(f"Full response: {json.dumps(result, indent=2)}", file=sys.stderr)
        sys.exit(1)

    parts = candidates[0].get("content", {}).get("parts", [])
    for part in parts:
        inline_data = part.get("inlineData") or part.get("inline_data")
        if inline_data and "data" in inline_data:
            return base64.b64decode(inline_data["data"])

    # If no image found, show what we got
    print("Error: No image data found in API response", file=sys.stderr)
    for part in parts:
        if "text" in part:
            print(f"Text response: {part['text']}", file=sys.stderr)
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
    parser = argparse.ArgumentParser(description="Generate blog thumbnail using Gemini API")
    parser.add_argument("--title", required=True, help="Article title")
    parser.add_argument("--slug", required=True, help="Article slug (for filename)")
    parser.add_argument("--output", required=True, help="Output file path")
    parser.add_argument("--description", default="", help="Article description")
    parser.add_argument("--tags", default="", help="Comma-separated tags")
    parser.add_argument("--category", default="tech", choices=["tech", "knowledge", "diary"], help="Article category")
    parser.add_argument("--style", default="minimal", choices=list(STYLES.keys()), help="Visual style")
    parser.add_argument("--aspect", default="16:9", help="Aspect ratio (e.g., 16:9, 4:3, 1:1)")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"Gemini model (default: {DEFAULT_MODEL})")
    parser.add_argument("--keyword", default="", help="English keyword to display prominently in the image")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable is not set", file=sys.stderr)
        sys.exit(1)

    prompt = build_prompt(args.title, args.description, args.tags, args.category, args.style, args.keyword)

    print(f"Model: {args.model}")
    print(f"Style: {args.style}")
    print(f"Generating thumbnail for: {args.title}")
    print(f"Prompt:\n{prompt}\n")

    image_bytes = generate_image(api_key, prompt, args.model, args.aspect)
    save_image(image_bytes, args.output)
    print("Done!")


if __name__ == "__main__":
    main()
