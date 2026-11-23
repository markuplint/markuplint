import { mlRuleTest } from 'markuplint';
import { describe, expect, test } from 'vitest';

import rule from './index.js';
import { fileURLToPath } from 'node:url';

/**
 * No element in the bundled HTML / SVG / MathML spec data currently declares
 * `globalAttrs['#ARIAAttrs']: false` — every element that defines the flag at
 * all sets it to `true` (verified by grepping `packages/@markuplint/html-spec`
 * for a `false` occurrence: none exist). This rule mirrors a check the `wai-aria`
 * umbrella rule always performed regardless, so these tests can only exercise
 * the "no false positive on an ordinary, ARIA-supporting element" path — the
 * report path is exactly the umbrella's `checkings`-less inline logic it
 * always ran, unchanged by this extraction.
 */
describe('ordinary elements permit ARIA attributes', () => {
	test('[no-aria-on-unsupported-element-001] div with role and aria-* is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="button" aria-pressed="false"></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-aria-on-unsupported-element-002] svg with role and aria-label is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<svg role="img" aria-label="A chart"></svg>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-aria-on-unsupported-element-003] no ARIA attribute at all is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<div></div>');
		expect(violations).toStrictEqual([]);
	});
});

describe('an attribute that the framework outputs or does not output', () => {
	/**
	 * A spec of its own is what makes this rule report (see `custom-spec.spec.ts`), and a spec passed to
	 * `mlRuleTest` takes effect only for the first run of a test file: the first call here passes `specs`.
	 */
	const specs = { '.*': fileURLToPath(new URL('no-aria-fixture.mjs', import.meta.url)) };
	const parser = { '.*': '@markuplint/jsx-parser' };

	test('[no-aria-on-unsupported-element-004] an attribute that the framework outputs is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-label={"x"}></div>', { parser, specs });
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 6,
				message: 'The "aria-label" attribute is disallowed',
				raw: 'aria-label={"x"}',
			},
		]);
	});

	test('[no-aria-on-unsupported-element-005] an attribute that the framework does not output is not an ARIA attribute of the element', async () => {
		const { violations } = await mlRuleTest(rule, '<div aria-label={null}></div>', { parser, specs });
		expect(violations).toStrictEqual([]);
	});
});
