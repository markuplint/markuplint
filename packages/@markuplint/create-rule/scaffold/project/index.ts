import { createPlugin } from '@markuplint/ml-core';

import { __ruleName__c } from './rules/__ruleName__.js';

export default createPlugin({
	name: '__pluginName__',
	create(setting) {
		return {
			rules: {
				// prettier-ignore
				'__ruleName__': __ruleName__c(setting),
			},
		};
	},
});
