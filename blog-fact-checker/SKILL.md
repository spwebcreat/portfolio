---
name: blog-fact-checker
description: "Blog article reviewer that performs both fact-checking and proofreading for markdown blog posts. Fact-check: verifies factual claims, statistics, URLs, API pricing, and technical details. Proofreading: checks typos, grammar, readability, redundant expressions, style consistency, and terminology. Use when the user asks to fact-check, proofread, or review a blog article. Triggers: 'ファクトチェック', 'fact check', '記事の事実確認', '記事の検証', '校正', '文章チェック', '誤字脱字', 'proofread', 'review article', 'リンクチェック', '記事レビュー'. Works with Astro Content Collections blog posts in src/content/blog/."
---

# Blog Fact Checker & Proofreader

Verify factual claims and proofread writing quality in blog articles under `src/content/blog/`.

## Workflow

### 1. Identify the Target Article

If not specified, ask the user which article to check. Articles are at `src/content/blog/{slug}.md`.

### 2. Read and Parse the Article

Read the markdown file. Note the frontmatter fields (`title`, `pubDate`, `category`, `tags`) for context.

### 3. Fact Check — Extract and Verify Claims

Scan the article body for these claim types:

| Type | Examples | Priority |
|------|----------|----------|
| **Statistics / Numbers** | "月に約100-150件", "確信度 ≥ 0.90" | High |
| **API / Pricing** | "gpt-4.1-mini", "1Mトークン: input=0.4ドル" | High |
| **URLs / Links** | Inline links `[text](url)`, referenced URLs | High |
| **Technical Facts** | "Structured Outputs でJSON形式", "GASの実行制限" | Medium |
| **Product Claims** | Feature descriptions, version numbers | Medium |
| **Dates** | "2026/02時点" | Low |

For each extracted claim:

1. **URLs**: Use `WebFetch` to check if the link is accessible and points to the expected content. Flag broken links, redirects to wrong pages, or domain mismatches (e.g., OpenAI docs linking to claude.com).
2. **API Pricing / Models**: Use `WebSearch` to find current official pricing. Compare with the article's stated values. Note if pricing has changed since `pubDate`.
3. **Statistics / Numbers**: Evaluate if they are the author's own data (not externally verifiable) or cite external sources. Only verify externally-sourced statistics.
4. **Technical Facts**: Use `WebSearch` to verify against official documentation.

### 4. Proofread — Check Writing Quality

Scan the full article text for the following issues:

#### 4a. Errors (誤り)

| Check | Description | Example |
|-------|-------------|---------|
| **Typos / Misconversion** | 漢字の変換ミス、タイポ | 「後悔」→「公開」、「以外」→「意外」 |
| **Missing / Extra Characters** | 文字の脱落・重複 | 「することがができる」 |
| **Incorrect Particles** | 助詞の誤用 | 「〜をできる」→「〜ができる」 |
| **Subject-Predicate Mismatch** | 主語と述語の不一致 | 「課題は…解決しました」→「課題を…解決しました」 |

#### 4b. Style (文体)

| Check | Description | Example |
|-------|-------------|---------|
| **Sentence-ending Consistency** | です/ます調 と だ/である調 の混在 | 記事全体で統一されているか |
| **Redundant Expressions** | 冗長な表現 | 「することができる」→「できる」、「という」の多用 |
| **Repeated Words** | 近接文での同一語句の繰り返し | 同じ接続詞が3回連続 |
| **Overly Long Sentences** | 一文が長すぎる（目安80文字超） | 読点で区切るか文を分割 |

#### 4c. Notation (表記)

| Check | Description | Example |
|-------|-------------|---------|
| **Halfwidth / Fullwidth Mix** | 英数字や記号の全角半角が不統一 | 「１００件」→「100件」 |
| **Punctuation** | 不適切な句読点・記号 | 「。。。」→「…」 |
| **Tech Term Consistency** | 技術用語の表記揺れ | 「Javascript」vs「JavaScript」、「Github」vs「GitHub」 |
| **Spacing** | 日本語と英数字の間のスペース | プロジェクト内で統一されているか |

### 5. Generate the Report

Output a structured report combining both results:

```
## 記事レビュー結果: {article title}

**対象記事**: `src/content/blog/{slug}.md`
**公開日**: {pubDate}
**チェック日**: {today}

---

## Part 1: ファクトチェック

**検出項目数**: {total} （✅ {verified} / ⚠️ {warning} / ❌ {incorrect} / 🔗 {link_issues}）

### ❌ 要修正（Incorrect）

1. **[具体的な記述]** (L{行番号})
   - 記事の記載: ...
   - 事実: ...
   - 情報源: [リンク]
   - 推奨修正: ...

### ⚠️ 要確認（Needs Review）

1. **[具体的な記述]** (L{行番号})
   - 記事の記載: ...
   - 確認結果: ...
   - 補足: ...

### 🔗 リンクチェック

| URL | ステータス | 備考 |
|-----|-----------|------|
| ... | ✅ OK / ❌ Broken / ⚠️ Mismatch | ... |

### ✅ 確認済み（Verified）

- [検証できた事実の一覧（簡潔に）]

### ℹ️ 検証対象外

- [著者の体験談・個人の感想など、外部検証できない項目]

---

## Part 2: 文章校正

**検出項目数**: {total} （🔴 誤り {errors} / 🟡 文体 {style} / 🔵 表記 {notation}）

### 🔴 誤り（要修正）

1. **[問題の種類]** (L{行番号})
   - 原文: 「...」
   - 修正案: 「...」
   - 理由: ...

### 🟡 文体（改善提案）

1. **[問題の種類]** (L{行番号})
   - 原文: 「...」
   - 改善案: 「...」
   - 理由: ...

### 🔵 表記（統一提案）

1. **[問題の種類]** (L{行番号})
   - 原文: 「...」
   - 修正案: 「...」

### 📝 総評

- 全体の読みやすさや文章のトーンについて1〜2文で総評
```

## Guidelines

### Fact Check

- **Author's own data is not verifiable**: Statements like "月に約100-150件届く" are the author's experience — mark as 検証対象外.
- **Pricing changes over time**: Always note the `pubDate` and check if pricing has been updated since. If different, mark as ⚠️ with both old and current values.
- **URL domain mismatch**: If a link claims to point to Service A but the domain belongs to Service B, flag as ❌.
- **Model names**: Verify that the referenced AI model actually exists and the name is correct.
- **Be conservative**: Only mark ❌ when clearly incorrect. Use ⚠️ for ambiguous or potentially outdated information.

### Proofreading

- **Respect the author's voice**: Suggest improvements, don't rewrite. The author's personality and tone should be preserved.
- **Blog is informal**: This is a personal tech blog, not a formal paper. Casual expressions like 「〜ですよね」「まあまあ」 are intentional — do not flag them.
- **Prioritize clarity**: Focus on issues that affect reader comprehension, not stylistic preferences.
- **Group related issues**: If the same type of error appears multiple times, summarize as a pattern rather than listing each individually.
- **Line numbers**: Always include the line number (L{n}) for every issue to enable quick navigation.

## Optional: Auto-Fix Mode

If the user requests fixes (e.g., "修正もして", "fix issues"), apply corrections directly to the markdown file after presenting the report and getting confirmation.
