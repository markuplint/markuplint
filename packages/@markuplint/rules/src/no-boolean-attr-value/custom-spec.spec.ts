import { fileURLToPath } from 'node:url';

import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

/**
 * No SVG attribute of the bundled spec data is Boolean, so the rule reaches its report on an `svg`
 * only with a spec of its own: `boolean-fixture.mjs` gives `svg` a Boolean `flag`.
 *
 * This lives in its own file because a spec passed to `mlRuleTest` takes effect only for the
 * first run of a test file: after a run with the bundled spec, a later run ignores `specs`.
 * Keep the first `mlRuleTest` call of this file one that passes `specs`.
 */
const specs = { '.*': fileURLToPath(new URL('boolean-fixture.mjs', import.meta.url)) };

test('[no-boolean-attr-value-issue-4309-003] an upper-case name on an svg element is not the Boolean attribute in JSX, and is in HTML', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg FLAG="flag" />', { parser, specs })).violations).toStrictEqual([]);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg flag="flag" />', { parser, specs });
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 10,
			message: 'The "flag" attribute is a boolean attribute. It doesn\'t need the value',
			raw: '="flag"',
		},
	]);

	// The HTML parser folds the name, so the upper-case one is the attribute
	const html = await mlRuleTest(rule, '<svg FLAG="flag"></svg>', { specs });
	expect(html.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 10,
			message: 'The "FLAG" attribute is a boolean attribute. It doesn\'t need the value',
			raw: '="flag"',
		},
	]);
});
