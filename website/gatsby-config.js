const path = require('path');
const package = require('../packages/markuplint/package.json');

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

		// Favicon
		{
			resolve: `gatsby-plugin-favicon`,
			options: {
				logo: path.resolve(__dirname, '..', 'media/favicon.png'),
				appName: package.name,
				appDescription: package.description,
				version: package.version,
				icons: {
					android: true,
					appleIcon: true,
					appleStartup: true,
					coast: false,
					favicons: true,
					firefox: true,
					opengraph: true,
					twitter: true,
					yandex: false,
					windows: true,
				},
			},
		},

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
