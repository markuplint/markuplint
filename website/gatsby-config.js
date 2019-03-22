const path = require('path');

module.exports = {
	siteMetadata: {
		siteName: `markuplint`,
	},
	plugins: [
		`gatsby-plugin-typescript`,
		`gatsby-plugin-react-helmet`,
		{
			resolve: `gatsby-source-filesystem`,
			options: {
				name: `rules`,
				path: path.resolve(__dirname, '..', 'packages/@markuplint/rules/src/'),
			},
		},
		{
			resolve: `gatsby-transformer-remark`,
			options: {
				// CommonMark mode (default: true)
				commonmark: true,
				// Footnotes mode (default: true)
				footnotes: true,
				// Pedantic mode (default: true)
				pedantic: true,
				// GitHub Flavored Markdown mode (default: true)
				gfm: true,
				// Plugins configs
				plugins: [],
			},
		},
	],
};
