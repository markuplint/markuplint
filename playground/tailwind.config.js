module.exports = {
	purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {
			scale: {
				300: '3',
			},
			cursor: {
				horizontal: 'ns-resize',
				vertical: 'ew-resize',
			},
		},
	},
	variants: {
		extend: {
			scale: ['focus-within'],
			margin: ['first', 'last'],
			padding: ['first', 'last'],
			borderWidth: ['first', 'last'],
		},
	},
	plugins: [],
};
