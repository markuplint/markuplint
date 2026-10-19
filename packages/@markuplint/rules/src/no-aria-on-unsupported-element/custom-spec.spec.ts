import { fileURLToPath } from 'node:url';

import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

/**
 * No element of the bundled spec data turns ARIA attributes off, so the rule reaches its report
 * only with a spec of its own: `no-aria-fixture.mjs` does it for `div`.
 *
 * This lives in its own file because a spec passed to `mlRuleTest` takes effect only for the
 * first run of a test file: after a run with the bundled spec, a later run ignores `specs`.
 * Keep the first `mlRuleTest` call of this file one that passes `specs`.
 */
const specs = { '.*': fileURLToPath(new URL('no-aria-fixture.mjs', import.meta.url)) };

test('[no-aria-on-unsupported-element-invalid-001] aria-* and role are reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" aria-label="x"></div>', { specs });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "role" attribute is disallowed',
			raw: 'role="button"',
		},
		{
			severity: 'error',
			line: 1,
			col: 20,
			message: 'The "aria-label" attribute is disallowed',
			raw: 'aria-label="x"',
		},
	]);
});

test('[no-aria-on-unsupported-element-issue-4309-001] an upper-case aria-* is reported like the lower-case one', async () => {
	const { violations } = await mlRuleTest(rule, '<div ARIA-LABEL="x"></div>', { specs });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "ARIA-LABEL" attribute is disallowed',
			raw: 'ARIA-LABEL="x"',
		},
	]);
});

test('[no-aria-on-unsupported-element-issue-4309-002] JSX: an upper-case aria-* on an HTML element is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div ARIA-LABEL="x" />', {
		parser: { '.*': '@markuplint/jsx-parser' },
		specs,
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "ARIA-LABEL" attribute is disallowed',
			raw: 'ARIA-LABEL="x"',
		},
	]);
});

test('[no-aria-on-unsupported-element-issue-4309-003] JSX: an upper-case aria-* on an svg element is not an ARIA attribute', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg ARIA-LABEL="x" />', { parser, specs })).violations).toStrictEqual([]);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg aria-label="x" />', { parser, specs });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "aria-label" attribute is disallowed',
			raw: 'aria-label="x"',
		},
	]);
});
