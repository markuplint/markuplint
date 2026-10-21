import { fileURLToPath } from 'node:url';

import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

/**
 * No SVG element of the bundled spec data has an attribute that an ARIA property is the equivalent
 * of, so the rule reaches its report on an `svg` only with a spec of its own:
 * `checked-fixture.mjs` gives `svg` a Boolean `checked`.
 *
 * This lives in its own file because a spec passed to `mlRuleTest` takes effect only for the
 * first run of a test file: after a run with the bundled spec, a later run ignores `specs`.
 * Keep the first `mlRuleTest` call of this file one that passes `specs`.
 */
const specs = { '.*': fileURLToPath(new URL('checked-fixture.mjs', import.meta.url)) };

test('[no-redundant-aria-prop-issue-4309-003] an upper-case aria-* on an svg element is not an ARIA property in JSX, and is in HTML', async () => {
	const parser = { '.*': '@markuplint/jsx-parser' };
	expect((await mlRuleTest(rule, '<svg checked ARIA-CHECKED="true" />', { parser, specs })).violations).toStrictEqual(
		[],
	);

	// Control: the lower-case name is reported on the same element
	const { violations } = await mlRuleTest(rule, '<svg checked aria-checked="true" />', { parser, specs });
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 14,
			message:
				'The "aria-checked" ARIA state has the same semantics as the current "checked" attribute or the implicit "checked" attribute',
			raw: 'aria-checked="true"',
		},
	]);

	// The HTML parser folds the name, so the upper-case one is the property
	const html = await mlRuleTest(rule, '<svg checked ARIA-CHECKED="true"></svg>', { specs });
	expect(html.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 14,
			message:
				'The "ARIA-CHECKED" ARIA state has the same semantics as the current "checked" attribute or the implicit "checked" attribute',
			raw: 'ARIA-CHECKED="true"',
		},
	]);
});
