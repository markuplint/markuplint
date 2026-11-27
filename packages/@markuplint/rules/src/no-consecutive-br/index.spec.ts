import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-consecutive-br-001] Consecutive', async () => {
	const { violations } = await mlRuleTest(rule, '<p>A<br data-first> <br data-second>B</p>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 21,
			raw: '<br data-second>',
			message: 'Consecutive "br" elements detected',
		},
	]);
});

test('[no-consecutive-br-002] a br in the content of a template is checked', async () => {
	const { violations } = await mlRuleTest(rule, '<template><p>A<br data-first> <br data-second>B</p></template>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 31,
			raw: '<br data-second>',
			message: 'Consecutive "br" elements detected',
		},
	]);
});

test('[no-consecutive-br-003] No consecutive', async () => {
	const { violations } = await mlRuleTest(rule, '<p>A<br data-first>B<br data-second>C</p>');
	expect(violations.length).toBe(0);
});

describe('fix', () => {
	test('[no-consecutive-br-004] remove second consecutive br', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<p>text<br><br></p>', undefined, true);
		expect(fixedCode).toBe('<p>text<br></p>');
	});

	test('[no-consecutive-br-005] three consecutive br elements', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<p>text<br><br><br></p>', undefined, true);
		expect(fixedCode).toBe('<p>text<br></p>');
	});

	test('[no-consecutive-br-006] consecutive br with whitespace between', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<p>text<br>  \n  <br></p>', undefined, true);
		expect(fixedCode).toBe('<p>text<br>  \n  </p>');
	});
});

describe('fix with parsers', () => {
	test('[no-consecutive-br-007] fix: Pug remove consecutive br', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'p\n\tbr\n\tbr',
			{ parser: { '.*': '@markuplint/pug-parser' } },
			true,
		);
		// The br tag is removed but the preceding whitespace (newline + tab) remains
		expect(fixedCode).toBe('p\n\tbr\n\t');
	});

	test('[no-consecutive-br-008] fix: Markdown raw HTML remove consecutive br', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'Paragraph\n\n<p>text<br><br></p>\n',
			{ parser: { '.*': '@markuplint/markdown-parser' } },
			true,
		);
		expect(fixedCode).toBe('Paragraph\n\n<p>text<br></p>\n');
	});
});

test('[no-consecutive-br-009] a reference to U+0020 between two br is white space between them', async () => {
	const { violations } = await mlRuleTest(rule, '<div><br>&#32;<br></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 15,
			message: 'Consecutive "br" elements detected',
			raw: '<br>',
		},
	]);
});

test.each(['&nbsp;', '\u00A0'])(
	'[no-consecutive-br-010] a no-break space between two br is a character between them: %j',
	async content => {
		expect((await mlRuleTest(rule, `<div><br>${content}<br></div>`)).violations).toStrictEqual([]);
	},
);
