import type { ExtendedSpec } from '@markuplint/ml-spec';

const spec: ExtendedSpec = {
	cites: ['https://reactjs.org/docs/dom-elements.html'],
	def: {
		'#globalAttrs': {
			'#extends': [
				{
					name: 'key',
					type: 'String',
					description: 'A special attribute for list rendering',
				},
				{
					name: 'ref',
					type: 'String',
					description: 'A special attribute for accessing child component instances and child elements',
				},
				{
					name: 'dangerouslySetInnerHTML',
					type: 'String',
					description: 'React’s replacement for using innerHTML in the browser DOM',
				},
				{
					name: 'suppressContentEditableWarning',
					type: 'Boolean',
					description:
						'Normally, there is a warning when an element with children is also marked as contentEditable, because it won’t work. This attribute suppresses that warning.',
				},
				{
					name: 'suppressHydrationWarning',
					type: 'Boolean',
					description:
						'If you set suppressHydrationWarning to true, React will not warn you about mismatches in the attributes and the content of that element.',
				},
			],
		},
	},
	specs: [
		{
			name: 'input',
			attributes: [
				{
					name: 'defaultChecked',
					type: 'Boolean',
					description:
						'defaultChecked is the uncontrolled equivalent, which sets whether the component is checked when it is first mounted.',
					caseSensitive: true,
					condition: {
						self: ['[type=checkbox]', '[type=radio]'],
					},
				},
				{
					name: 'defaultValue',
					type: 'String',
					caseSensitive: true,
					description:
						'defaultValue is the uncontrolled equivalent, which sets the value of the component when it is first mounted.',
				},
			],
		},
		{
			name: 'select',
			attributes: [
				{
					name: 'value',
					type: 'String',
					description:
						'The value attribute is supported by <input>, <select> and <textarea> components. You can use it to set the value of the component.',
				},
				{
					name: 'defaultValue',
					type: 'String',
					caseSensitive: true,
					description:
						'defaultValue is the uncontrolled equivalent, which sets the value of the component when it is first mounted.',
				},
			],
		},
		{
			name: 'textarea',
			attributes: [
				{
					name: 'value',
					type: 'String',
					description:
						'The value attribute is supported by <input>, <select> and <textarea> components. You can use it to set the value of the component.',
				},
				{
					name: 'defaultValue',
					type: 'String',
					caseSensitive: true,
					description:
						'defaultValue is the uncontrolled equivalent, which sets the value of the component when it is first mounted.',
				},
			],
		},
	],
};

export default spec;
