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
		// The rule now also surfaces parse5's `unknown-named-character-reference`
		// for `&x25BC;` (the missed-`#` typo that parse5 reports as a malformed
		// named reference). The original missed-escape detection at col 48
		// continues to report the bare `&`.
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 54,
				raw: 'x25BC;',
				message: 'The character reference is unknown-named-character-reference',
			},
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

// parse5 onParseError hook coverage — the rule reads `document.parseErrors`
// and reports each of the 8 character-reference codes under its own ruleId.
// Each test pins one code with a minimal input. If parse5 ever stops firing
// one of these (rename, removal, behaviour change in the tokenizer), the
// matching assertion fails immediately rather than the regression hiding
// behind the rule's broader self-detection.
describe('parse5 character-reference hook (#3844)', () => {
	test('[character-reference-invalid-003] unknown-named-character-reference', async () => {
		const { violations } = await mlRuleTest(rule, '<p>&xyz;</p>');
		expect(violations.some(v => v.message.includes('unknown-named-character-reference'))).toBe(true);
	});

	test('[character-reference-invalid-004] missing-semicolon-after-character-reference', async () => {
		const { violations } = await mlRuleTest(rule, '<p>&amp text</p>');
		expect(violations.some(v => v.message.includes('missing-semicolon-after-character-reference'))).toBe(true);
	});

	test('[character-reference-invalid-005] absence-of-digits-in-numeric-character-reference', async () => {
		const { violations } = await mlRuleTest(rule, '<p>&#;</p>');
		expect(violations.some(v => v.message.includes('absence-of-digits-in-numeric-character-reference'))).toBe(true);
	});

	test('[character-reference-invalid-006] null-character-reference', async () => {
		const { violations } = await mlRuleTest(rule, '<p>&#x0;</p>');
		expect(violations.some(v => v.message.includes('null-character-reference'))).toBe(true);
	});

	test('[character-reference-invalid-007] surrogate-character-reference', async () => {
		// U+D800 — surrogate range
		const { violations } = await mlRuleTest(rule, '<p>&#xD800;</p>');
		expect(violations.some(v => v.message.includes('surrogate-character-reference'))).toBe(true);
	});

	test('[character-reference-invalid-008] control-character-reference', async () => {
		// U+0001 — C0 control (not the parse5-allowed list)
		const { violations } = await mlRuleTest(rule, '<p>&#x1;</p>');
		expect(violations.some(v => v.message.includes('control-character-reference'))).toBe(true);
	});

	test('[character-reference-invalid-009] noncharacter-character-reference', async () => {
		// U+FFFE — noncharacter
		const { violations } = await mlRuleTest(rule, '<p>&#xFFFE;</p>');
		expect(violations.some(v => v.message.includes('noncharacter-character-reference'))).toBe(true);
	});

	test('[character-reference-invalid-010] character-reference-outside-unicode-range', async () => {
		// Above U+10FFFF — out of Unicode range
		const { violations } = await mlRuleTest(rule, '<p>&#x110000;</p>');
		expect(violations.some(v => v.message.includes('character-reference-outside-unicode-range'))).toBe(true);
	});
});
