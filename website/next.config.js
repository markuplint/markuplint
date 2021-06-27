const withMdxEnhanced = require('next-mdx-enhanced');
const rehypePrism = require('@mapbox/rehype-prism');

module.exports = withMdxEnhanced({
	layoutPath: 'src/layouts',
	defaultLayout: true,
	rehypePlugins: [rehypePrism],
})({
	// https://github.com/vercel/next.js/discussions/26186
	webpack5: false,
	pageExtensions: ['mdx', 'tsx'],
});
