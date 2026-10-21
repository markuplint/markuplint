import { fileURLToPath } from 'node:url';

import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

/**
 * No SVG element of the bundled spec data prohibits naming, so the rule reaches its report on an
 * `svg` only with a spec of its own: `naming-prohibited-fixture.mjs` does it for `svg`.
 *
 * This lives in its own file because a spec passed to `mlRuleTest` takes effect only for the
 * first run of a test file: after a run with the bundled spec, a later run ignores `specs`.
 * Keep the first `mlRuleTest` call of this file one that passes `specs`.
 */
const specs = { '.*': fileURLToPath(new URL('naming-prohibited-fixture.mjs', import.meta.url)) };

test('[no-prohibited-naming-issue-4309-005] an upper-case aria-label on an svg element is not a naming attribute in JSX, and is in HTML', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg ARIA-LABEL="x" />', { parser, specs })).violations).toStrictEqual([]);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg aria-label="x" />', { parser, specs });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "aria-label" ARIA property is prohibited on the "svg" element',
			raw: 'aria-label="x"',
		},
	]);

	// The HTML parser folds the name, so the upper-case one is the attribute
	const html = await mlRuleTest(rule, '<svg ARIA-LABEL="x"></svg>', { specs });
	expect(html.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "ARIA-LABEL" ARIA property is prohibited on the "svg" element',
			raw: 'ARIA-LABEL="x"',
		},
	]);
});
