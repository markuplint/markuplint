import { fileURLToPath } from 'node:url';

import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

/**
 * A spec of its own is what makes this rule report (see `custom-spec.spec.ts`), and a spec passed to
 * `mlRuleTest` takes effect only for the first run of a test file: the first call here passes `specs`.
 */
const specs = { '.*': fileURLToPath(new URL('no-aria-fixture.mjs', import.meta.url)) };
const parser = { '.*': '@markuplint/jsx-parser' };

test('[no-aria-on-unsupported-element-issue-4435-001] an attribute that the framework outputs is reported', async () => {
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

test('[no-aria-on-unsupported-element-issue-4435-002] an attribute that the framework does not output is not an ARIA attribute of the element', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-label={null}></div>', { parser, specs });
	expect(violations).toStrictEqual([]);
});
