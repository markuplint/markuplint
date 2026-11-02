import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[attr-value-quotes-issue-4435-001] a literal in {…} is written as code and is not judged', async () => {
	const { violations } = await mlRuleTest(rule, "<div title={'x'} aria-busy={true} disabled={false}></div>", {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[attr-value-quotes-issue-4435-002] a single expression in quotes of Svelte is an expression', async () => {
	const { violations } = await mlRuleTest(rule, "<button disabled='{false}'></button>", {
		parser: { '.*': '@markuplint/svelte-parser' },
		specs: { '.*': '@markuplint/svelte-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[attr-value-quotes-issue-4435-003] a value of Pug is code and is not judged', async () => {
	const { violations } = await mlRuleTest(rule, "a(href='x')", { parser: { '.*': '@markuplint/pug-parser' } });
	expect(violations).toStrictEqual([]);
});

test('[attr-value-quotes-issue-4435-004] a string of HTML is judged as before', async () => {
	const { violations } = await mlRuleTest(rule, "<div title='x'></div>");
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			message: 'Attribute value is must quote on double quotation mark',
			raw: "title='x'",
		},
	]);
});
