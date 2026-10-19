import { fileURLToPath } from 'node:url';

import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

/**
 * No SVG attribute of the bundled spec data is obsolete, so the rule reaches its report on an
 * `svg` only with a spec of its own: `obsolete-fixture.mjs` gives `svg` an obsolete `flag`.
 *
 * This lives in its own file because a spec passed to `mlRuleTest` takes effect only for the
 * first run of a test file: after a run with the bundled spec, a later run ignores `specs`.
 * Keep the first `mlRuleTest` call of this file one that passes `specs`.
 */
const specs = { '.*': fileURLToPath(new URL('obsolete-fixture.mjs', import.meta.url)) };

test('[no-obsolete-attr-issue-4309-002] an upper-case name on an svg element is not the obsolete attribute in JSX, and is in HTML', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg FLAG="x" />', { parser, specs })).violations).toStrictEqual([]);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg flag="x" />', { parser, specs });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "flag" attribute is obsolete',
			raw: 'flag',
		},
	]);

	// The HTML parser folds the name, so the upper-case one is the attribute
	const html = await mlRuleTest(rule, '<svg FLAG="x"></svg>', { specs });
	expect(html.violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			message: 'The "flag" attribute is obsolete',
			raw: 'FLAG',
		},
	]);
});
