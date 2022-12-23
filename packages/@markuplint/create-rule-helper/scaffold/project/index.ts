import { createPlugin } from '@markuplint/ml-core';

import { __ruleName__ } from './rules/__ruleName__';

export default createPlugin({
	name: '__pluginName__',
	create(setting) {
		return {
			rules: {
				__ruleName__: __ruleName__(setting),
			},
		};
	},
});
