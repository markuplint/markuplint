import { describe, expect, test } from 'vitest';

import { composeIdentity } from './compose-identity.js';

// Vue gives a prop the attribute of the usage site by the camelCase of its name: `<Inner my-label="Save">`
// and `<Inner myLabel="Save">` are the prop `myLabel`. The outer component is written in Vue when its
// template is, which the caller says.
describe('a prop of the inner component that the outer component writes in a Vue template', () => {
	const inner = {
		element: 'button',
		attrs: [{ name: 'aria-label', value: { fromAttr: 'myLabel', omitIfMissing: true as const } }],
		slots: true as const,
	};

	const found = { element: 'button', attrs: [{ name: 'aria-label', value: 'Save' }], slots: true };
	const omitted = { element: 'button', slots: true };

	test.each([
		['my-label', found],
		['myLabel', found],
		['mylabel', omitted],
	])('the attribute %s is the prop myLabel', (name, expected) => {
		expect(
			composeIdentity({ element: 'Base', attrs: [{ name, value: 'Save' }], slots: true }, inner, { vue: true }),
		).toStrictEqual(expected);
	});

	// A prop declared by a string key (`defineProps({ 'my-label': String })`) is the same prop
	test.each([
		['my-label', found],
		['myLabel', found],
		['mylabel', omitted],
	])('the attribute %s is the prop my-label', (name, expected) => {
		const kebabInner = {
			element: 'button',
			attrs: [{ name: 'aria-label', value: { fromAttr: 'my-label', omitIfMissing: true as const } }],
			slots: true as const,
		};
		expect(
			composeIdentity({ element: 'Base', attrs: [{ name, value: 'Save' }], slots: true }, kebabInner, {
				vue: true,
			}),
		).toStrictEqual(expected);
	});

	test('another name is not, and the attribute is omitted', () => {
		expect(
			composeIdentity({ element: 'Base', attrs: [{ name: 'my-labels', value: 'Save' }], slots: true }, inner, {
				vue: true,
			}),
		).toStrictEqual({ element: 'button', slots: true });
	});

	test('in another language the name is compared without regard to case only', () => {
		const written = composeIdentity(
			{ element: 'Base', attrs: [{ name: 'mylabel', value: 'Save' }], slots: true },
			inner,
		);
		expect(written).toStrictEqual({
			element: 'button',
			attrs: [{ name: 'aria-label', value: 'Save' }],
			slots: true,
		});

		const kebab = composeIdentity(
			{ element: 'Base', attrs: [{ name: 'my-label', value: 'Save' }], slots: true },
			inner,
		);
		expect(kebab).toStrictEqual({ element: 'button', slots: true });
	});
});
