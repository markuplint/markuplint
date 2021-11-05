import type { ExtendedSpec } from '@markuplint/ml-spec';

const spec: ExtendedSpec = {
	def: {
		'#globalAttrs': {
			'#extends': [
				{
					name: 'key',
					type: 'String',
					description: 'A special attribute for list rendering',
					condition: {
						self: '[v-for]',
					},
				},
				{
					name: 'ref',
					type: 'String',
					description: 'A special attribute for accessing child component instances and child elements',
				},
			],
		},
	},
};

export default spec;
