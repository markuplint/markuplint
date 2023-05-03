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
	plugins: [],
};
