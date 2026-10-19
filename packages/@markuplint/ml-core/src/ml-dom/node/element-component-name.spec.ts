import type { Pretender } from '@markuplint/ml-config';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { convertRuleset } from '../../convert-ruleset.js';

import { MLDocument } from './document.js';

function createDocument(
	sourceCode: string,
	options?: { readonly isComponentName?: (name: string) => boolean; readonly pretenders?: readonly Pretender[] },
) {
	return new MLDocument(
		parser.parse(sourceCode),
		convertRuleset(),
		[spec as unknown as MLMLSpec, {}],
		{ ariaVersion: ARIA_RECOMMENDED_VERSION },
		options,
	);
}

describe('MLDocument#isComponentName', () => {
	test('is the form that most languages share when the parser says nothing', () => {
		const document = createDocument('<div></div>');

		expect(document.isComponentName('Tabs.Root')).toBe(true);
		expect(document.isComponentName('Foo')).toBe(true);
		expect(document.isComponentName('div')).toBe(false);
		expect(document.isComponentName('_foo')).toBe(false);
	});

	test('is the rule of the parser when it has one', () => {
		const document = createDocument('<div></div>', { isComponentName: name => name.startsWith('_') });

		expect(document.isComponentName('_foo')).toBe(true);
		expect(document.isComponentName('Foo')).toBe(false);
	});
});

describe('The target of a pretender', () => {
	const pretenders = [{ selector: 'x-a', as: '_layout' }] as const;

	// A target that is a component counts as a custom element; an HTML element without a hyphen does not
	test('is a component when the rule of the document says so', () => {
		const el = createDocument('<x-a></x-a>', {
			pretenders,
			isComponentName: name => name.startsWith('_'),
		}).querySelector('x-a');

		expect(el?.isCustomElement).toBe(true);
	});

	test('is an element when the rule of the document says it is not', () => {
		const el = createDocument('<x-a></x-a>', { pretenders }).querySelector('x-a');

		expect(el?.isCustomElement).toBe(false);
	});
});
