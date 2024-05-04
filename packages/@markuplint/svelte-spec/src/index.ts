import type { ExtendedSpec } from '@markuplint/ml-spec';

const spec: ExtendedSpec = {
	specs: [
		{
			name: 'textarea',
			attributes: {
				value: {
					type: 'Any',
				},
			},
		},
	],
};

export default spec;
