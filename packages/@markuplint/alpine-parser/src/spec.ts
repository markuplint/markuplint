import type { ExtendedSpec } from '@markuplint/ml-spec';

/**
 * > `x-model` works with the following input elements:
 * > - `<input type="text">`
 * > - `<textarea>`
 * > - `<input type="checkbox">`
 * > - `<input type="radio">`
 * > - `<select>`
 * > - `<input type="range">`
 *
 * @see https://alpinejs.dev/directives/model
 */
const xModel = {
	type: 'NoEmptyAny',
	description: 'The x-model directive is used to bind a variable to a form input.',
} as const;

const spec: ExtendedSpec = {
	specs: [
		{
			name: 'template',
			attributes: {
				/**
				 * @see https://alpinejs.dev/directives/for
				 */
				'x-for': {
					type: 'NoEmptyAny',
					description:
						"Alpine's x-for directive allows you to create DOM elements by iterating through a list. Here's a simple example of using it to create a list of colors based on an array.",
				},
				/**
				 * @see https://alpinejs.dev/directives/for#keys
				 */
				key: {
					type: 'NoEmptyAny',
					description:
						'It is important to specify unique keys for each x-for iteration if you are going to be re-ordering items. Without dynamic keys, Alpine may have a hard time keeping track of what re-orders and will cause odd side-effects.',
					condition: '[x-for]',
				},
				/**
				 * @see https://alpinejs.dev/directives/teleport
				 */
				'x-teleport': {
					type: 'NoEmptyAny',
					description:
						'The x-teleport directive allows you to transport part of your Alpine template to another part of the DOM on the page entirely.',
				},
				/**
				 * @see https://alpinejs.dev/directives/if
				 */
				'x-if': {
					type: 'NoEmptyAny',
					description:
						'x-if is used for toggling elements on the page, similarly to x-show, however it completely adds and removes the element it\'s applied to rather than just changing its CSS display property to "none".',
				},
			},
		},
		{
			name: 'input',
			attributes: {
				'x-model': {
					...xModel,
					condition: '[type=text i], [type=checkbox i], [type=radio i], [type=range i]',
				},
			},
		},
		{
			name: 'select',
			attributes: {
				'x-model': xModel,
			},
		},
		{
			name: 'textarea',
			attributes: {
				'x-model': xModel,
			},
		},
	],
};

// eslint-disable-next-line import/no-default-export
export default spec;
