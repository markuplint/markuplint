export default {
	printWidth: 120,
	tabWidth: 4,
	useTabs: true,
	singleQuote: true,
	trailingComma: 'all',
	bracketSpacing: true,
	arrowParens: 'avoid',
	overrides: [
		{
			files: '.*rc',
			options: { parser: 'json' },
		},
		{
			files: ['*.{md,mdx}'],
			options: {
				tabWidth: 2,
				useTabs: false,
			},
		},
	],
};
