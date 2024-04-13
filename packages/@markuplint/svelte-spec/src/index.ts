import type { ExtendedSpec } from '@markuplint/ml-spec';

const spec: ExtendedSpec = {
	specs: [
		{
			name: 'select',
			attributes: {
				value: {
					type: 'Any',
				},
			},
		},
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
