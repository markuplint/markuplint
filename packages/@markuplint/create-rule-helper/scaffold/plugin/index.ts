import { createPlugin } from '@markuplint/ml-core';

import { foo } from './rules';

export default createPlugin({
	name: '{{ name }}',
	create(settings) {
		return {
			rules: {
				foo: foo(settings),
			},
		};
	},
});
