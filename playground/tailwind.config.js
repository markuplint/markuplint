import { iconsPlugin, getIconCollections } from '@egoist/tailwindcss-icons';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				'ml-blue': '#1572EB',
				'ml-blue-darker': '#0f55b1',
				'ml-ink': '#333333',
			},
		},
	},
	plugins: [
		iconsPlugin({
			prefix: 'icon',
			collections: {
				...getIconCollections([
					// https://heroicons.com/
					'heroicons-solid',
					// https://www.majesticons.com/
					// https://icon-sets.iconify.design/majesticons/
					'majesticons',
				]),
				custom: {
					icons: {
						'loading-wrapper': {
							body: '<path fill="currentColor" d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12Z"/>',
							width: 24,
							height: 24,
						},
						loading: {
							body: '<path fill="currentColor" d="M4 12C4 9.87827 4.84285 7.84344 6.34315 6.34315C7.84344 4.84285 9.87827 4 12 4V0C5.373 0 0 5.373 0 12H4ZM6 17.291C4.70821 15.8316 3.99661 13.949 4 12H0C0 15.042 1.135 17.824 3 19.938L6 17.291Z"/>',
							width: 24,
							height: 24,
						},
					},
				},
			},
		}),
	],
};
