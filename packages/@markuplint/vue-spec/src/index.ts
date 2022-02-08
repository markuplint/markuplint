import type { ExtendedSpec } from '@markuplint/ml-spec';

const spec: ExtendedSpec = {
	def: {
		'#globalAttrs': {
			'#extends': {
				key: {
					type: 'NoEmptyAny',
					description: 'A special attribute for list rendering',
					condition: {
						self: '[v-for]',
					},
				},
				ref: {
					type: 'NoEmptyAny',
					description: 'A special attribute for accessing child component instances and child elements',
				},
			},
		},
	},
	specs: [
		{
			name: 'slot',
			possibleToAddProperties: true,
		},
	],
};

export default spec;
