import specs from '@markuplint/html-spec';
import { createJSDOMElement, markAttrAsDynamic } from '@markuplint/test-tools';
import { describe, test, expect } from 'vitest';

import { getExplicitRole } from './get-explicit-role.js';

function must<T>(value: T | null | undefined): T {
	if (value == null) {
		throw new Error('The value is missing');
	}
	return value;
}

function region(html: string) {
	const container = createJSDOMElement(`<div id="container">${html}</div>`);
	return { container, region: must(container.querySelector('[role=region]')) };
}

describe('a landmark role that requires a name', () => {
	test('[get-explicit-role-landmark-001] is not exposed when aria-labelledby refers to no element', () => {
		const { region: el } = region('<h2 id="h"></h2><div role="region" aria-labelledby="t"></div>');
		expect(getExplicitRole(specs, el, '1.2')).toStrictEqual({ el, role: null, errorType: 'INVALID_LANDMARK' });
	});

	test('[get-explicit-role-landmark-002] is exposed when the value of aria-labelledby is not known', () => {
		const { region: el } = region('<div role="region" aria-labelledby="t"></div>');
		markAttrAsDynamic(el, 'aria-labelledby');
		expect(getExplicitRole(specs, el, '1.2').role?.name).toBe('region');
	});

	test('[get-explicit-role-landmark-003] is exposed when the tree has an element whose id is not known', () => {
		const { container, region: el } = region('<h2 id="h"></h2><div role="region" aria-labelledby="t"></div>');
		markAttrAsDynamic(must(container.querySelector('h2')), 'id');
		expect(getExplicitRole(specs, el, '1.2').role?.name).toBe('region');
	});

	test('[get-explicit-role-landmark-004] is not exposed when the element whose id is not known is in another tree', () => {
		const { container, region: el } = region(
			'<template><h2 id="h"></h2></template><div role="region" aria-labelledby="t"></div>',
		);
		markAttrAsDynamic(must(must(container.querySelector('template')).content.querySelector('h2')), 'id');
		expect(getExplicitRole(specs, el, '1.2').errorType).toBe('INVALID_LANDMARK');
	});

	test('[get-explicit-role-landmark-005] is exposed when aria-labelledby refers to an element that is known', () => {
		const { region: el } = region('<h2 id="t"></h2><div role="region" aria-labelledby="t"></div>');
		expect(getExplicitRole(specs, el, '1.2').role?.name).toBe('region');
	});

	test('[get-explicit-role-landmark-006] is not exposed by an empty aria-labelledby next to an element whose id is not known', () => {
		const { container, region: el } = region('<h2 id="h"></h2><div role="region" aria-labelledby=""></div>');
		markAttrAsDynamic(must(container.querySelector('h2')), 'id');
		expect(getExplicitRole(specs, el, '1.2').errorType).toBe('INVALID_LANDMARK');
	});

	test('[get-explicit-role-landmark-007] is not exposed by a white-space-only aria-labelledby next to an element whose id is not known', () => {
		const { container, region: el } = region('<h2 id="h"></h2><div role="region" aria-labelledby="  "></div>');
		markAttrAsDynamic(must(container.querySelector('h2')), 'id');
		expect(getExplicitRole(specs, el, '1.2').errorType).toBe('INVALID_LANDMARK');
	});

	test('[get-explicit-role-landmark-008] is exposed by an aria-labelledby whose one token holds U+00A0', () => {
		const { region: el } = region('<h2 id="a\u00A0b">T</h2><div role="region" aria-labelledby="a\u00A0b"></div>');
		expect(getExplicitRole(specs, el, '1.2').role?.name).toBe('region');
	});
});

describe('the tokens of the role attribute', () => {
	const nbsp = String.fromCodePoint(160);
	const kelvin = String.fromCodePoint(8490);

	test('[get-explicit-role-tokens-001] are split on ASCII white space', () => {
		const el = must(createJSDOMElement('<div><div role=" foo\tbutton"></div></div>').querySelector('[role]'));
		expect(getExplicitRole(specs, el, '1.2').role?.name).toBe('button');
	});

	test('[get-explicit-role-tokens-002] fold only the ASCII letters: U+212A KELVIN SIGN is not a K', () => {
		const el = must(createJSDOMElement(`<div><div role="lin${kelvin}"></div></div>`).querySelector('[role]'));
		expect(getExplicitRole(specs, el, '1.2').role).toBeNull();
	});

	test('[get-explicit-role-tokens-003] are matched ASCII case-insensitively', () => {
		const el = must(createJSDOMElement('<div><div role="LINK"></div></div>').querySelector('[role]'));
		expect(getExplicitRole(specs, el, '1.2').role?.name).toBe('link');
	});

	test('[get-explicit-role-tokens-004] none is a role attribute that names no role', () => {
		const el = must(createJSDOMElement('<div><div role=" "></div></div>').querySelector('[role]'));
		expect(getExplicitRole(specs, el, '1.2').errorType).toBe('ROLE_NO_EXISTS');
	});

	test('[get-explicit-role-tokens-005] are not split on U+00A0', () => {
		const el = must(createJSDOMElement(`<div><div role="button${nbsp}link"></div></div>`).querySelector('[role]'));
		expect(getExplicitRole(specs, el, '1.2').role).toBeNull();
	});
});
