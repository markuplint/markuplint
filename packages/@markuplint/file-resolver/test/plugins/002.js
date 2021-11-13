// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createPlugin } = require('@markuplint/ml-core');

module.exports = createPlugin({
	// No name
	create() {
		return {};
	},
});
