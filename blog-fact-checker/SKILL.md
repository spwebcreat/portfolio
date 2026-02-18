---
name: blog-fact-checker
description: "Blog article fact-checker that verifies factual claims, statistics, URLs, API pricing, and technical details in markdown blog posts. Use when the user asks to fact-check a blog article, verify claims, or review article accuracy. Triggers: 'ファクトチェック', 'fact check', '記事の事実確認', '記事の検証', 'verify article', 'check facts', 'リンクチェック'. Works with Astro Content Collections blog posts in src/content/blog/."
---

# Blog Fact Checker

Verify factual claims, links, and technical details in blog articles under `src/content/blog/`.

## Workflow

### 1. Identify the Target Article

If not specified, ask the user which article to check. Articles are at `src/content/blog/{slug}.md`.

### 2. Read and Parse the Article

Read the markdown file. Note the frontmatter fields (`title`, `pubDate`, `category`, `tags`) for context.

### 3. Extract Checkable Claims

Scan the article body for these claim types:

| Type | Examples | Priority |
|------|----------|----------|
| **Statistics / Numbers** | "月に約100-150件", "確信度 ≥ 0.90" | High |
| **API / Pricing** | "gpt-4.1-mini", "1Mトークン: input=0.4ドル" | High |
| **URLs / Links** | Inline links `[text](url)`, referenced URLs | High |
| **Technical Facts** | "Structured Outputs でJSON形式", "GASの実行制限" | Medium |
| **Product Claims** | Feature descriptions, version numbers | Medium |
| **Dates** | "2026/02時点" | Low |

### 4. Verify Each Claim

For each extracted claim:

1. **URLs**: Use `WebFetch` to check if the link is accessible and points to the expected content. Flag broken links, redirects to wrong pages, or domain mismatches (e.g., OpenAI docs linking to claude.com).
2. **API Pricing / Models**: Use `WebSearch` to find current official pricing. Compare with the article's stated values. Note if pricing has changed since `pubDate`.
3. **Statistics / Numbers**: Evaluate if they are the author's own data (not externally verifiable) or cite external sources. Only verify externally-sourced statistics.
4. **Technical Facts**: Use `WebSearch` to verify against official documentation.

### 5. Generate the Report

Output a structured report in this format:

```
## ファクトチェック結果: {article title}

**対象記事**: `src/content/blog/{slug}.md`
**公開日**: {pubDate}
**チェック日**: {today}
**検出項目数**: {total} （✅ {verified} / ⚠️ {warning} / ❌ {incorrect} / 🔗 {link_issues}）

---

### ❌ 要修正（Incorrect）

1. **[具体的な記述]**
   - 記事の記載: ...
   - 事実: ...
   - 情報源: [リンク]
   - 推奨修正: ...

### ⚠️ 要確認（Needs Review）

1. **[具体的な記述]**
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
```

## Verification Guidelines

- **Author's own data is not verifiable**: Statements like "月に約100-150件届く" are the author's experience — mark as 検証対象外.
- **Pricing changes over time**: Always note the `pubDate` and check if pricing has been updated since. If different, mark as ⚠️ with both old and current values.
- **URL domain mismatch**: If a link claims to point to Service A but the domain belongs to Service B, flag as ❌.
- **Model names**: Verify that the referenced AI model actually exists and the name is correct.
- **Be conservative**: Only mark ❌ when clearly incorrect. Use ⚠️ for ambiguous or potentially outdated information.

## Optional: Auto-Fix Mode

If the user requests fixes (e.g., "修正もして", "fix issues"), apply corrections directly to the markdown file after presenting the report and getting confirmation.
