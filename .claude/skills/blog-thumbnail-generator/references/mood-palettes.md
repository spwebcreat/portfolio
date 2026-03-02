# Mood-Based Color Palettes

Detailed reference for the 6 mood palettes used in thumbnail generation.

## Detection Priority

1. **Keyword match** in title/description (score-based: highest match count wins)
2. **Tag hints** (e.g., "React" → educational, "Figma" → creative)
3. **Category fallback** (tech → educational, knowledge → creative, diary → friendly)

## Palettes

### educational
- **Background**: `#0A1628` (deep navy)
- **Primary**: `#38BDF8` (sky blue)
- **Secondary**: `#6366F1` (indigo)
- **Highlight**: `#FDFDFD`
- **Tone**: Intellectual, clear, trustworthy
- **Keywords**: 解説, 方法, 入門, 使い方, チュートリアル, 実装, 構築, API, guide, tutorial

### urgent
- **Background**: `#1C0A0A` (deep crimson)
- **Primary**: `#EF4444` (red)
- **Secondary**: `#F97316` (orange)
- **Highlight**: `#FDFDFD`
- **Tone**: Bold, attention-grabbing, decisive
- **Keywords**: 注意, 速報, 危険, セキュリティ, 脆弱性, breaking, critical

### inspirational
- **Background**: `#0A1A14` (deep forest)
- **Primary**: `#34D399` (emerald)
- **Secondary**: `#A3E635` (lime)
- **Highlight**: `#F0FFF8`
- **Tone**: Uplifting, growth-oriented, optimistic
- **Keywords**: 成長, 挑戦, ポートフォリオ, フリーランス, 目標, journey, growth

### professional
- **Background**: `#0F1219` (deep slate)
- **Primary**: `#94A3B8` (slate)
- **Secondary**: `#818CF8` (violet)
- **Highlight**: `#FDFDFD`
- **Tone**: Refined, authoritative, sophisticated
- **Keywords**: ビジネス, キャリア, 運用, 管理, 効率, マネジメント, business

### friendly
- **Background**: `#1A1408` (deep amber)
- **Primary**: `#FBBF24` (amber)
- **Secondary**: `#FB7185` (rose)
- **Highlight**: `#FFF8F0`
- **Tone**: Warm, approachable, playful
- **Keywords**: 日常, 雑記, 日記, おすすめ, レビュー, 趣味, diary, review

### creative
- **Background**: `#1A0A10` (deep magenta)
- **Primary**: `#E50035` (brand red, matches site --primary)
- **Secondary**: `#F59E0B` (amber)
- **Highlight**: `#FFF8F0`
- **Tone**: Expressive, artistic, vibrant
- **Keywords**: デザイン, UI, UX, Figma, アニメーション, CSS, creative

## Tag → Visual Modifier Mapping

| Tag | Visual Element |
|-----|---------------|
| AI | Neural pathways, AI brain visualization |
| React | Web UI component cards |
| Astro | Rocket trail, starfield |
| Next.js | Server infrastructure with data flow |
| GAS | Spreadsheet, automation workflow |
| CSS | Browser with styled elements |
| TypeScript | Code editor with syntax highlighting |
| Three.js | 3D geometric object |
| WordPress | CMS dashboard |
| Python | Terminal with code execution |
| Firebase | Cloud database, data sync |
| Figma | Design tool interface |
| Design | Color swatches, layout grids |
| Docker | Container blocks, ship metaphor |
| Git | Branching tree diagram |
| API | Endpoints with data flow |
| Database | Structured data tables |
| Security | Shield, digital protection |
| Performance | Speedometer, benchmark graph |
