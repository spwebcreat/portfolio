import { defineConfig } from 'astro/config';
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import lenis from "astro-lenis";
import icon from "astro-icon";
import partytown from '@astrojs/partytown';
// https://astro.build/config
export default defineConfig({
  site: 'https://www.sp-webcreat.pro',
  integrations: [
    tailwind(),
    react(),
    mdx(),
    lenis(),
    icon({
      include: {
        octicon: ['*'], // octicon アイコンセットを追加
      },
    }),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
  ],
  vite: {
    plugins: [],
        
    resolve: {
      alias: {
        '@': '/src', // '@' を '/src' ディレクトリにエイリアス
      },
    },
    css: {
      preprocessorOptions: {
        stylus: {
          // ここに Stylus の設定オプションを追加できます
        },
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000, // 1000kBに設定
  },
  script: {
    external: ['https://www.googletagmanager.com/gtm.js'],
  },
});