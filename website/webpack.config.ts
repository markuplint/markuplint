export default {
	entry: './src/index.ts',
	output: {
		path: `${__dirname}/resources/`,
		filename: 'main.js',
		publicPath: '/resources/',
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
