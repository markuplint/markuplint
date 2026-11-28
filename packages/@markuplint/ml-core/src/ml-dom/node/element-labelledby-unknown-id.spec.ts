import type { MLDocument } from './document.js';

import { getComputedRole } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

async function jsx(code: string) {
	return createTestDocument(code, { parser: await import('@markuplint/jsx-parser') });
}

function img(doc: MLDocument<any, any>) {
	const el = doc.querySelector('img');
	expect(el).not.toBeNull();
	return el!;
}

/**
 * An `aria-labelledby` whose reference is not known until it is rendered may refer to an element that
 * gives a name, so the element is not known to have none: `labelledbyMayReferToUnknownId` of
 * `@markuplint/ml-spec` is the criterion.
 */
describe('MLElement#mayHaveAccessibleName with an aria-labelledby that may refer to an unknown id', () => {
	test.each([
		['the value is not known', '<div><img aria-labelledby={id} /><p id="a">A</p></div>'],
		['the target id is not known', '<div><img aria-labelledby="a" /><p id={id}>A</p></div>'],
		['the value and the target id are not known', '<div><img aria-labelledby={id} /><p id={id}>A</p></div>'],
	])('%s: no name as written, and may have one', async (_, code) => {
		const el = img(await jsx(code));
		expect(el.getAccessibleName('1.3')).toBe('');
		expect(el.mayHaveAccessibleName('1.3')).toBe(true);
	});

	test.each([
		[
			'the token refers to no element and every id is known',
			'<div><img aria-labelledby="a" /><p id="b">A</p></div>',
			true,
		],
		['the attribute is not output', '<div><img aria-labelledby={undefined} /><p id={id}>A</p></div>', false],
	])('%s: a name of a file that is a part of a page is not known, no name otherwise', async (_, code, mayHave) => {
		const el = img(await jsx(code));
		expect(el.mayHaveAccessibleName('1.3')).toBe(mayHave);
	});

	test('an element that has a target found by its id is named as written', async () => {
		const el = img(await jsx('<div><img aria-labelledby="a" /><p id="a">A</p><p id={id}>B</p></div>'));
		expect(el.getAccessibleName('1.3')).toBe('A');
		expect(el.mayHaveAccessibleName('1.3')).toBe(true);
	});

	test('the accessibility properties tell that the name is not known', async () => {
		const doc = await jsx('<div><img aria-labelledby={id} /><p id={id}>A</p></div>');
		const prop = doc.getAccessibilityProp(img(doc));
		expect(prop).toMatchObject({ exposedToTree: true, name: { unknown: true } });
	});

	test('the accessibility properties tell that the name is not known in a file that is a part of a page', async () => {
		const doc = await jsx('<div><img aria-labelledby="a" /><p id="b">A</p></div>');
		const prop = doc.getAccessibilityProp(img(doc));
		expect(prop).toMatchObject({ exposedToTree: true, name: { unknown: true } });
	});

	test('a token written with a character reference is resolved, so it is not a reference to an unknown id', async () => {
		const el = img(await jsx('<div><img aria-labelledby="&#97;" /><p id="a"></p><p id={id}></p></div>'));
		expect(el.mayHaveAccessibleName('1.3')).toBe(false);
	});

	test.each([
		['a token that refers to no element is among them', '<img aria-labelledby="a z" />', true],
		['each token refers to an element', '<img aria-labelledby="a b" />', false],
	])('%s, in a tree that has an element of unknown id', async (_, img_, may) => {
		const doc = await jsx(`<div>${img_}<p id="a"></p><p id="b"></p><p id={id}></p></div>`);
		expect(img(doc).mayHaveAccessibleName('1.3')).toBe(may);
	});

	test('the role that the name computation resolves is the one of a named element', async () => {
		// The computation of the name asks for the role, and the role asks `:aria(has name)` of the element
		// that is being computed: that inner call is the one that must answer from the reference too
		const doc = await jsx('<div><section aria-labelledby={id}>S</section><p id={id}>A</p></div>');
		const section = doc.querySelector('section');
		expect(section).not.toBeNull();
		expect(section!.mayHaveAccessibleName('1.3')).toBe(true);
		expect(getComputedRole(doc.specs, section!, '1.3').role?.name).toBe('region');
	});

	test('the name that the aria-labelledby may give makes a section a region', async () => {
		const doc = await jsx('<div><section aria-labelledby={id}>S</section><p id={id}>A</p></div>');
		const section = doc.querySelector('section');
		expect(section).not.toBeNull();
		expect(doc.getAccessibilityProp(section!)).toMatchObject({ role: 'region' });
	});
});
