# SP WEBCREAT. Portfolio

フリーランス WEB エンジニア / UI・UX デザイナーのポートフォリオサイト。

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Astro 4 + React |
| Style | Tailwind CSS 3 + Stylus |
| 3D | Three.js (react-three/fiber, drei) |
| Animation | Framer Motion, Lenis (smooth scroll) |
| Analytics | Google Tag Manager (Partytown) |
| Font | Montserrat (Google Fonts) |
| CI/CD | GitHub Actions → FTP Deploy |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (localhost:4321)
npm run dev

# Type check & production build
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
src/
├── assets/img/            # Images (optimized at build time)
├── components/
│   ├── Layouts/
│   │   ├── About.astro        # About section
│   │   ├── Projects.astro     # Personal projects
│   │   ├── Works.astro        # Client works
│   │   ├── Blogs.astro        # Blog section
│   │   └── Footer.astro       # Footer
│   ├── MainVisual/
│   │   └── index.astro        # Three.js 3D hero visual
│   └── ThreeModel/            # 3D model components (React)
├── layouts/
│   └── Layout.astro           # Base layout (GTM, meta, fonts)
├── pages/
│   └── index.astro            # Single page entry
└── styles/
    └── global.styl            # Global styles
```

## Deployment

`main` branch への push で GitHub Actions が自動実行されます。

1. `npm ci` → `npm run build`
2. `dist/` を FTP でサーバーにデプロイ

Secrets の設定は **Settings > Secrets and variables > Actions** で管理:

- `FTP_SERVER` / `FTP_USERNAME` / `FTP_PASSWORD` / `FTP_SERVER_DIR`

> `*.md`, `docs/**`, `LICENSE`, `.gitignore` のみの変更ではデプロイはスキップされます。
