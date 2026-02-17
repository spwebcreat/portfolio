/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: 'var(--primary)',
				},
				bk: {
					DEFAULT: 'var(--bk)',
				},
				gray: {
					DEFAULT: 'var(--gray)',
				},
				white: {
					DEFAULT: 'var(--white)',
				},
				blue: {
					DEFAULT: 'var(--blue)',
				},
			},
		},
	},
	plugins: [],
}
