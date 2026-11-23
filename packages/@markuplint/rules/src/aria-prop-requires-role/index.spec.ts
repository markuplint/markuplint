import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';

test('[aria-prop-requires-role-001] global prop without role', async () => {
	expect((await mlRuleTest(rule, '<div aria-label="text"></div>')).violations).toStrictEqual([]);
});

test('[aria-prop-requires-role-002] any prop with role', async () => {
	expect((await mlRuleTest(rule, '<div role="button" aria-pressed="true"></div>')).violations).toStrictEqual([]);
});

test('[aria-prop-requires-role-003] a global prop in upper case without role is valid', async () => {
	expect((await mlRuleTest(rule, '<div ARIA-LABEL="text"></div>')).violations).toStrictEqual([]);
});

test('[aria-prop-requires-role-004] a non-global prop in upper case without role is reported by the spelling written', async () => {
	const { violations } = await mlRuleTest(rule, '<cite ARIA-PRESSED="true"></cite>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "ARIA-PRESSED" ARIA state is not global state',
			raw: 'ARIA-PRESSED="true"',
		},
	]);
});

test('[aria-prop-requires-role-005] JSX: an upper-case aria-* on an HTML element is checked like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<cite ARIA-PRESSED="true" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 7,
			message: 'The "ARIA-PRESSED" ARIA state is not global state',
			raw: 'ARIA-PRESSED="true"',
		},
	]);
});

test('[aria-prop-requires-role-006] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg><circle ARIA-PRESSED="true" /></svg>', { parser })).violations).toStrictEqual(
		[],
	);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg><circle aria-pressed="true" /></svg>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 14,
			message: 'The "aria-pressed" ARIA state is not global state',
			raw: 'aria-pressed="true"',
		},
	]);
});

describe('issue-4744', () => {
	/**
	 * Vue renders a `<template v-if>` away, so the `menuitemradio` in a `group` in it has the `menu` above as the
	 * parent that it requires, and its `aria-checked` is a property of its role, not a global one.
	 */
	const code =
		'<template><div role="menu"><template v-if="x"><div role="group"><button type="button" role="menuitemradio" aria-checked="true">g</button></div></template></div></template>';

	test('[aria-prop-requires-role-007] the role of an element in a template that is rendered away is kept', async () => {
		const { violations } = await mlRuleTest(rule, code, {
			parser: { '.*': '@markuplint/vue-parser' },
			specs: { '.*': '@markuplint/vue-spec' },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[aria-prop-requires-role-008] it is kept without @markuplint/vue-spec as well', async () => {
		const { violations } = await mlRuleTest(rule, code, { parser: { '.*': '@markuplint/vue-parser' } });
		expect(violations).toStrictEqual([]);
	});
});
