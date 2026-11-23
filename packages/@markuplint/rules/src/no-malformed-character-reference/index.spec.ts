import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-malformed-character-reference-001] reports the malformed named reference, not the well-formed numeric ones', async () => {
	const { violations } = await mlRuleTest(rule, '<span>&#9660;</span><span>&#x25BC;</span><span>&x25BC;</span>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 54,
			raw: 'x25BC;',
			message: 'The character reference is unknown-named-character-reference',
		},
	]);
});

// parse5 onParseError hook coverage — the rule reads `document.parseErrors`
// and reports each of the 8 character-reference codes under its own ruleId.
// Each test pins one code with a minimal input. If parse5 ever stops firing
// one of these (rename, removal, behaviour change in the tokenizer), the
// matching assertion fails immediately rather than the regression hiding
// behind the rule's broader self-detection.
test('[no-malformed-character-reference-002] unknown-named-character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<p>&xyz;</p>');
	expect(violations.some(v => v.message.includes('unknown-named-character-reference'))).toBe(true);
});

test('[no-malformed-character-reference-003] missing-semicolon-after-character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<p>&amp text</p>');
	expect(violations.some(v => v.message.includes('missing-semicolon-after-character-reference'))).toBe(true);
});

test('[no-malformed-character-reference-004] absence-of-digits-in-numeric-character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<p>&#;</p>');
	expect(violations.some(v => v.message.includes('absence-of-digits-in-numeric-character-reference'))).toBe(true);
});

test('[no-malformed-character-reference-005] null-character-reference', async () => {
	const { violations } = await mlRuleTest(rule, '<p>&#x0;</p>');
	expect(violations.some(v => v.message.includes('null-character-reference'))).toBe(true);
});

test('[no-malformed-character-reference-006] surrogate-character-reference', async () => {
	// U+D800 — surrogate range
	const { violations } = await mlRuleTest(rule, '<p>&#xD800;</p>');
	expect(violations.some(v => v.message.includes('surrogate-character-reference'))).toBe(true);
});

test('[no-malformed-character-reference-007] control-character-reference', async () => {
	// U+0001 — C0 control (not the parse5-allowed list)
	const { violations } = await mlRuleTest(rule, '<p>&#x1;</p>');
	expect(violations.some(v => v.message.includes('control-character-reference'))).toBe(true);
});

test('[no-malformed-character-reference-008] noncharacter-character-reference', async () => {
	// U+FFFE — noncharacter
	const { violations } = await mlRuleTest(rule, '<p>&#xFFFE;</p>');
	expect(violations.some(v => v.message.includes('noncharacter-character-reference'))).toBe(true);
});

test('[no-malformed-character-reference-009] character-reference-outside-unicode-range', async () => {
	// Above U+10FFFF — out of Unicode range
	const { violations } = await mlRuleTest(rule, '<p>&#x110000;</p>');
	expect(violations.some(v => v.message.includes('character-reference-outside-unicode-range'))).toBe(true);
});

test('[no-malformed-character-reference-010] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<div>&#x110000;</div>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 16,
			message: '文字参照はcharacter-reference-outside-unicode-rangeです',
			raw: '#x110000;',
		},
	]);
});

test('[no-malformed-character-reference-011] another error code is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<div>&#0;</div>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 10,
			message: '文字参照はnull-character-referenceです',
			raw: '#0;',
		},
	]);
});
