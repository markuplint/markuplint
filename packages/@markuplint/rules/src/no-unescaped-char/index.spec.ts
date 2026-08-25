import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-unescaped-char-invalid-001] a literal "<" is always flagged', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"> > < & " \' &amp;</div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'Illegal characters must escape in character reference',
			line: 1,
			col: 16,
			raw: '<',
		},
	]);
});

test('[no-unescaped-char-valid-001] ">", a bare "&", and """ are conforming by default', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"> > & " \' &amp;</div>');
	expect(violations).toStrictEqual([]);
});

test('[no-unescaped-char-valid-002] a bare "&" in an attribute value is conforming by default', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="path/to?a=b&c=d">');
	expect(violations).toStrictEqual([]);
});

test('[no-unescaped-char-strict-001] strict flags ">", """, and a bare "&" too', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"> > < & " \' &amp;</div>', {
		rule: { options: { strict: true } },
	});
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

test('[no-unescaped-char-strict-002] strict flags a bare "&" in an attribute value', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="path/to?a=b&c=d">', {
		rule: { options: { strict: true } },
	});
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

test('[no-unescaped-char-issue-1074] #1074: a well-formed numeric reference is exempt even in strict mode', async () => {
	// `&#9660;` / `&#x25BC;` are well-formed numeric references, exempt in
	// strict mode. `&x25BC;` (the missed-`#` typo) mixes a letter and digits,
	// so it doesn't match the entity-shape mask (letters-only or numeric) and
	// its bare `&` is still flagged here — the malformed-reference half
	// (`unknown-named-character-reference`) is
	// no-malformed-character-reference's concern, not this rule's.
	const { violations } = await mlRuleTest(rule, '<span>&#9660;</span><span>&#x25BC;</span><span>&x25BC;</span>', {
		rule: { options: { strict: true } },
	});
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

test('[no-unescaped-char-valid-003] script content is exempt', async () => {
	const { violations } = await mlRuleTest(rule, '<script>if (i < 0) console.log("<markuplint>");</script>', {
		rule: { options: { strict: true } },
	});
	expect(violations.length).toBe(0);
});

test('[no-unescaped-char-parser-001] in Vue', async () => {
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

test('[no-unescaped-char-parser-002] in EJS', async () => {
	const { violations } = await mlRuleTest(rule, '<title><%- "title" _%></title>', {
		parser: {
			'.*': '@markuplint/ejs-parser',
		},
	});
	expect(violations.length).toBe(0);
});

test('[no-unescaped-char-issue-1575] #1575: no false positive on orphaned end tag', async () => {
	const { violations } = await mlRuleTest(rule, '<div></p></div>');
	expect(violations).toStrictEqual([]);
});
