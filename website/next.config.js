/* eslint-disable @typescript-eslint/no-var-requires */
const withMdxEnhanced = require('next-mdx-enhanced');
const rehypePrism = require('@mapbox/rehype-prism');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const withCSS = require('@zeit/next-css');
/* eslint-enable @typescript-eslint/no-var-requires */

module.exports = withMdxEnhanced({
	layoutPath: 'src/layouts',
	defaultLayout: true,
	rehypePlugins: [rehypePrism],
})(
	withCSS({
		pageExtensions: ['mdx', 'tsx'],
		webpack: config => {
			config.module.rules.push({
				test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
				use: {
					loader: 'url-loader',
					options: {
						limit: 100000,
					},
				},
			});

			console.log(config.module.rules);

			config.plugins.push(
				new MonacoWebpackPlugin({
					languages: ['html'],
					filename: 'static/[name].worker.js',
				}),
			);

			config.output.globalObject = 'self';

			return config;
		},
	}),
);
