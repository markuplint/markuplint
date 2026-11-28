import type { ARIARoleOwnedProperties } from '../../types/index.js';

import specs from '@markuplint/html-spec';
import { createSelector } from '@markuplint/selector';
import { createJSDOMElement } from '@markuplint/test-tools';
import { describe, expect, test } from 'vitest';

import { getARIARequiredStates } from './required-state.js';

function _(html: string) {
	// A `col` is parsed only in a table
	const [code, selector] = html.startsWith('<col') ? [`<table><colgroup>${html}</colgroup></table>`, 'col'] : [html];
	return createJSDOMElement(code, selector, function (selector) {
		// JSDOM supports no level 4 selectors yet.
		return createSelector(selector, specs).match(this) !== false;
	});
}

const OPTIONAL: ARIARoleOwnedProperties = { name: 'aria-valuetext' };
const REQUIRED: ARIARoleOwnedProperties = { name: 'aria-valuemax', required: true };
const WHEN_FOCUSABLE: ARIARoleOwnedProperties = {
	name: 'aria-valuenow',
	required: true,
	requiredCondition: 'focusable',
};
const CHECKED: ARIARoleOwnedProperties = { name: 'aria-checked', required: true };

describe('getARIARequiredStates', () => {
	test.each([
		// Not required
		['<div></div>', OPTIONAL, false, { required: false, satisfiedByElement: false }],
		['<div></div>', OPTIONAL, true, { required: false, satisfiedByElement: false }],
		// Required without a condition
		['<div></div>', REQUIRED, false, { required: true, satisfiedByElement: false }],
		// Required only when the element may be focusable
		['<div></div>', WHEN_FOCUSABLE, false, { required: false, satisfiedByElement: false }],
		['<div tabindex="0"></div>', WHEN_FOCUSABLE, false, { required: true, satisfiedByElement: false }],
		// An implicit role is satisfied by the element
		['<div tabindex="0"></div>', WHEN_FOCUSABLE, true, { required: true, satisfiedByElement: true }],
		['<div></div>', WHEN_FOCUSABLE, true, { required: false, satisfiedByElement: false }],
		// A native attribute in its place (`properties.without[].alt` of `input[type=checkbox]`)
		['<input type="checkbox" checked>', CHECKED, false, { required: true, satisfiedByElement: true }],
		['<input type="checkbox">', CHECKED, false, { required: true, satisfiedByElement: false }],
		// An element whose ARIA spec allows no property (`properties: false`) has no attribute in its place
		['<col tabindex="0">', WHEN_FOCUSABLE, false, { required: true, satisfiedByElement: false }],
	] as const)('%s %j (implicit: %s)', (html, ownedProp, isImplicit, expected) => {
		const states = getARIARequiredStates(specs, _(html), { ownedProperties: [ownedProp], isImplicit }, '1.3');
		expect(states.get(ownedProp.name)).toStrictEqual(expected);
	});

	test('resolves every owned property', () => {
		const states = getARIARequiredStates(
			specs,
			_('<div tabindex="0"></div>'),
			{ ownedProperties: [OPTIONAL, REQUIRED, WHEN_FOCUSABLE] },
			'1.3',
		);
		expect([...states]).toStrictEqual([
			['aria-valuetext', { required: false, satisfiedByElement: false }],
			['aria-valuemax', { required: true, satisfiedByElement: false }],
			['aria-valuenow', { required: true, satisfiedByElement: false }],
		]);
	});
});
