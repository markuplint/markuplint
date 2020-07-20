import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';

export default {
	entry: './src/index.ts',
	output: {
		path: `${__dirname}/scripts/`,
		filename: 'main.js',
		publicPath: '/scripts/',
	},
	resolve: {
		extensions: ['.js', '.json', '.ts'],
	},
	module: {
		rules: [
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
