import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import path from 'path';
import sveltePreprocess from 'svelte-preprocess';

export default {
	entry: './src/index.ts',
	output: {
		path: `${__dirname}/scripts/`,
		filename: 'main.js',
		publicPath: '/scripts/',
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
				test: /\.(html|svelte)$/,
				loader: 'svelte-loader',
				options: {
					hotReload: true,
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
			},
			{
				test: /\.css$/i,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.ttf$/,
				use: [
					'file-loader',
					{
						loader: 'ttf-loader',
						options: {
							name: './font/[hash].[ext]',
						},
					},
				],
			},
		],
	},
	devServer: {
		contentBase: `${__dirname}/`,
		compress: true,
		port: 9000,
		open: true,
	},
	plugins: [
		new MonacoWebpackPlugin({
			languages: ['html'],
		}),
	],
	stats: 'errors-only',
};
