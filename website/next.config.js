const withMdxEnhanced = require('next-mdx-enhanced');
const rehypePrism = require('@mapbox/rehype-prism');

module.exports = withMdxEnhanced({
	layoutPath: 'src/layouts',
	defaultLayout: true,
	rehypePlugins: [rehypePrism],
})({
	webpack5: false,
	pageExtensions: ['mdx', 'tsx'],
});
