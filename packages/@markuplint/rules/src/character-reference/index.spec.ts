import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[character-reference-invalid-001] character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"> > < & " \' &amp;</div>');
	expect(violations.length).toBe(4);
	expect(violations[0]).toStrictEqual({
		severity: 'error',
		message: 'Illegal characters must escape in character reference',
		line: 1,
		col: 14,
		raw: '>',
	});
	expect(violations[1]?.col).toBe(16);
	expect(violations[1]?.raw).toBe('<');
	expect(violations[2]?.col).toBe(18);
	expect(violations[2]?.raw).toBe('&');
	expect(violations[3]?.col).toBe(20);
	expect(violations[3]?.raw).toBe('"');
});

test('[character-reference-invalid-002] character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="path/to?a=b&c=d">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'Illegal characters must escape in character reference',
			line: 1,
			col: 22,
			raw: '&',
		},
	]);
});

test('[character-reference-valid-001] character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<script>if (i < 0) console.log("<markuplint>");</script>');
	expect(violations.length).toBe(0);
});

test('[character-reference-parser-001] in Vue', async () => {
	const { violations } = await mlRuleTest(rule, '<template><div v-if="a < b"></div></template>', {
		parser: {
			'.*': '@markuplint/vue-parser',
		},
		specs: {
			'.*': '@markuplint/vue-spec',
		},
	});
	expect(violations.length).toBe(0);
});

test('[character-reference-parser-002] in EJS', async () => {
	const { violations } = await mlRuleTest(rule, '<title><%- "title" _%></title>', {
		parser: {
			'.*': '@markuplint/ejs-parser',
		},
	});
	expect(violations.length).toBe(0);
});

describe('Issues', () => {
	test('[character-reference-issue-1575] #1575: no false positive on orphaned end tag', async () => {
		const { violations } = await mlRuleTest(rule, '<div></p></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[character-reference-issue-1074] #1074', async () => {
		const { violations } = await mlRuleTest(rule, '<span>&#9660;</span><span>&#x25BC;</span><span>&x25BC;</span>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'Illegal characters must escape in character reference',
				line: 1,
				col: 48,
				raw: '&',
			},
		]);
	});
});
