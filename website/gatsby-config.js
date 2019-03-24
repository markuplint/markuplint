const path = require('path');
const package = require('../package.json');

module.exports = {
	siteMetadata: {
		name: package.name,
		description: package.description,
		siteName: `${package.name} - ${package.description}`,
	},
	plugins: [
		// typescript
		`gatsby-plugin-typescript`,

		// Meta header
		`gatsby-plugin-react-helmet`,

		// Images
		{
			resolve: `gatsby-source-filesystem`,
			options: {
				name: `images`,
				path: path.resolve(__dirname, '..', 'media'),
			},
		},
		`gatsby-plugin-sharp`,
		`gatsby-transformer-sharp`,

		// Rules Pages
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
				commonmark: true,
				footnotes: true,
				pedantic: true,
				gfm: true,
				plugins: [],
			},
		},
	],
};
