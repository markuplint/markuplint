import type { Pretender } from '@markuplint/ml-config';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { convertRuleset } from '../../convert-ruleset.js';

import { MLDocument } from './document.js';

const pretendersOf = (fromAttr: string): readonly Pretender[] => [
	{
		selector: 'x-comp',
		as: {
			element: 'button',
			attrs: [{ name: 'aria-label', value: { fromAttr, omitIfMissing: true } }],
		},
	},
];

function labelOf(sourceCode: string, componentNameVariants: boolean, fromAttr = 'myLabel') {
	const document = new MLDocument(
		parser.parse(sourceCode),
		convertRuleset(),
		[spec as unknown as MLMLSpec, {}],
		{ ariaVersion: ARIA_RECOMMENDED_VERSION },
		{ componentNameVariants, pretenders: pretendersOf(fromAttr) },
	);
	const el = document.querySelector('x-comp');
	return (el?.pretenderContext as { as: { getAttribute(name: string): string | null } } | null)?.as.getAttribute(
		'aria-label',
	);
}

// Vue passes an attribute of the usage site to a prop by the camelCase of its name:
// `<Comp my-label="x">` and `<Comp myLabel="x">` give the prop `myLabel`.
describe('a prop of a pretender and the attribute at the usage site of a component of Vue', () => {
	test.each([
		['my-label', 'Hi'],
		['myLabel', 'Hi'],
		['mylabel', null],
	])('the attribute %s is the prop myLabel', (name, label) => {
		expect(labelOf(`<x-comp ${name}="Hi"></x-comp>`, true)).toBe(label);
	});

	// A prop declared by a string key (`defineProps({ 'my-label': String })`) is the same prop
	test.each([
		['my-label', 'Hi'],
		['myLabel', 'Hi'],
		['mylabel', null],
	])('the attribute %s is the prop my-label', (name, label) => {
		expect(labelOf(`<x-comp ${name}="Hi"></x-comp>`, true, 'my-label')).toBe(label);
	});

	test('another name is not', () => {
		expect(labelOf('<x-comp my-labels="Hi"></x-comp>', true)).toBeNull();
		expect(labelOf('<x-comp label="Hi"></x-comp>', true)).toBeNull();
	});

	test('where the document does not resolve a component by any spelling of its name, the name is compared as it was', () => {
		expect(labelOf('<x-comp mylabel="Hi"></x-comp>', false)).toBe('Hi');
		expect(labelOf('<x-comp my-label="Hi"></x-comp>', false)).toBeNull();
		expect(labelOf('<x-comp my-label="Hi"></x-comp>', false, 'my-label')).toBe('Hi');
	});
});
