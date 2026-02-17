# ADR-001: ブログ機能のアーキテクチャ

## ステータス

承認済み — 2026-02-17

## コンテキスト

ポートフォリオサイトにブログ機能を追加する。
現状は `Blogs.astro` が「Coming Soon...」の状態で、以前の WP REST API 取得コード (`src/wp/wordpress.tsx`) が残っている。

ブログの目的:
- 技術記事（開発Tips、技術検証、学習記録）
- 制作ノウハウ（デザイン・コーディングの制作過程、クライアントワークの知見）
- フリーランスとしての発信力強化

## 決定

### 段階的アプローチで構築する

**Phase 1: Markdown (Astro Content Collections)**
- Astro の Content Collections (`src/content/blog/`) で MD/MDX ファイル管理
- ビルド時に静的生成（SSG）
- トップページに最新記事一覧、`/blog/[slug]` で詳細ページ
- カテゴリ・タグによる分類

**Phase 2: ヘッドレス CMS 移行**
- Phase 1 完成後、ヘッドレス CMS（microCMS / Newt 等）に移行
- データ取得部分のみ差し替え、表示ロジックは再利用
- CMS 選定は Phase 1 完了後に比較検討

### 表示形式

- トップページ: 最新記事を数件表示（カード形式）
- ブログ一覧: `/blog` に全記事一覧
- 詳細ページ: `/blog/[slug]` で記事本文を表示

### コンテンツ構造（Phase 1）

```
src/content/
  blog/
    my-first-post.md
    astro-tips.md
    ...
  config.ts          # コレクション定義（schema）
```

Frontmatter スキーマ（想定）:

```yaml
title: 記事タイトル
description: 記事の概要
pubDate: 2026-02-17
updatedDate: 2026-02-18    # optional
category: tech | works     # 技術記事 or 制作ノウハウ
tags: [Astro, React, ...]
image: ./cover.jpg          # optional, OGP・カード用
draft: false                # true なら非公開
```

## 移行時の注意点

- Phase 2 移行時、URL 構造 (`/blog/[slug]`) は維持する
- SEO（OGP, メタタグ）は Phase 1 から対応しておく
- `src/wp/wordpress.tsx` は Phase 2 以降で不要になるため、Phase 1 開始時に削除を検討

## 不採用にした案

- **WordPress**: サーバー/DB が別途必要でオーバースペック。ポートフォリオサイトには不向き
- **外部プラットフォームリンク型** (Zenn/Qiita): 自サイト内で完結しないため、ポートフォリオとしての統一感が損なわれる
- **最初からヘッドレス CMS**: 未経験のため、まず表示側の実装を固めてからデータソースを切り替える方が学習効率が良い
