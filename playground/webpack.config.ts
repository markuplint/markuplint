import webpack, { Configuration } from 'webpack';
import { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import HTMLInlineCSSWebpackPlugin from 'html-inline-css-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import ScriptExtHtmlWebpackPlugin from 'script-ext-html-webpack-plugin';
import glob from 'glob';
import path from 'path';
import sass from 'sass';
import sveltePreprocess from 'svelte-preprocess';
import util from 'util';

const asyncGlob = util.promisify(glob);

const distDir = path.resolve(__dirname, 'dist');

async function build(mode: Mode): Promise<Configuration & DevServerConfiguration> {
	return {
		mode,
		devtool: mode === 'production' ? false : 'eval-cheap-module-source-map',
		devServer: {
			hot: true,
			compress: true,
			port: 9000,
			open: true,
		},
		entry: './src/index.ts',
		output: {
			path: distDir,
			filename: 'main.js',
			publicPath: '/',
		},
		resolve: {
			extensions: ['.mjs', '.js', '.json', '.ts', '.svelte'],
			alias: {
				svelte: path.resolve(__dirname, '..', 'node_modules', 'svelte'),
			},
			mainFields: ['svelte', 'browser', 'module', 'main'],
		},
		module: {
			rules: [
				{
					test: /\.html$/,
					include: path.resolve(__dirname, 'src', 'pages'),
					use: ['html-loader'],
				},
				{
					test: /\.svelte$/,
					loader: 'svelte-loader',
					options: {
						preprocess: sveltePreprocess(),
						hotOptions: {
							noPreserveState: true,
						},
					},
				},
				{
					test: /.ts?$/,
					loader: 'ts-loader',
				},
				{
					test: /.js?$/,
					loader: 'babel-loader',
					options: {
						cacheDirectory: true,
					},
					exclude: /node_modules/,
				},
				{
					test: /\.scss$/i,
					include: path.resolve(__dirname, 'src', 'style'),
					use: [
						{
							loader: MiniCssExtractPlugin.loader,
							options: {
								esModule: true,
								publicPath: '/',
							},
						},
						'css-loader',
						'postcss-loader',
						{
							loader: 'sass-loader',
							options: {
								implementation: sass,
							},
						},
					],
				},
				{
					test: /\.css$/i,
					include: path.resolve(__dirname, '..', 'node_modules'),
					use: ['style-loader', 'css-loader'],
				},
				{
					test: /\.(png|jpe?g|gif|svg|ttf)$/i,
					type: 'asset/resource',
				},
			],
		},
		plugins: [
			...(mode === 'development'
				? [
						new webpack.SourceMapDevToolPlugin({
							filename: '[file].map',
							exclude: ['/vendor/'],
						}),
				  ]
				: []),
			new MonacoWebpackPlugin({
				languages: ['html'],
			}),
			new MiniCssExtractPlugin({
				filename: '[name].css',
				chunkFilename: '[id].css',
			}),
			...(await htmlConfig()),
			new ScriptExtHtmlWebpackPlugin({
				defaultAttribute: 'defer',
			}),
			new HTMLInlineCSSWebpackPlugin(),
		],
	};
}

async function htmlConfig() {
	const srcDir = path.resolve(__dirname, 'src', 'pages');
	const htmlFiles = await asyncGlob(path.resolve(srcDir, '**/*.html'));
	return htmlFiles.map(src => {
		const resPath = path.relative(srcDir, src);
		const resDir = path.dirname(resPath);
		const name = path.basename(resPath, path.extname(resPath));
		const filename = path.resolve(distDir, resDir, `${name}.html`);
		return new HtmlWebpackPlugin({
			filename,
			template: src,
			minify: {
				caseSensitive: true,
				collapseBooleanAttributes: true,
				collapseWhitespace: true,
				conservativeCollapse: true,
				includeAutoGeneratedTags: false,
				removeComments: false,
				minifyCSS: true,
				minifyJS: true,
			},
			scriptLoading: 'defer',
			hash: true,
		});
	});
}

export default async (_: any, argv: Configuration): Promise<Configuration | Configuration[]> => {
	const { mode } = argv;

	const config = await build(mode || 'development');

	return config;
};

type Mode = 'production' | 'development' | 'none';
