export default {
	entry: './src/main.js',
	output: {
		path: `${__dirname}/resources/`,
		filename: 'main.js',
		publicPath: '/resources/',
	},
	module: {
		rules: [
			{
				test: /.js?$/,
				loader: 'babel-loader',
			},
		],
	},
	devServer: {
		contentBase: `${__dirname}/`,
		compress: true,
		port: 9000,
		open: true,
	},
	stats: 'errors-only',
};
