import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-consecutive-br-invalid-001] Consecutive', async () => {
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

test('[no-consecutive-br-valid-001] No consecutive', async () => {
	const { violations } = await mlRuleTest(rule, '<p>A<br data-first>B<br data-second>C</p>');
	expect(violations.length).toBe(0);
});

describe('fix', () => {
	test('[no-consecutive-br-fix-001] remove second consecutive br', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<p>text<br><br></p>', undefined, true);
		expect(fixedCode).toBe('<p>text<br></p>');
	});

	test('[no-consecutive-br-fix-002] three consecutive br elements', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<p>text<br><br><br></p>', undefined, true);
		expect(fixedCode).toBe('<p>text<br></p>');
	});

	test('[no-consecutive-br-fix-003] consecutive br with whitespace between', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<p>text<br>  \n  <br></p>', undefined, true);
		expect(fixedCode).toBe('<p>text<br>  \n  </p>');
	});
});

describe('fix with parsers', () => {
	test('[no-consecutive-br-fix-004] fix: Pug remove consecutive br', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'p\n\tbr\n\tbr',
			{ parser: { '.*': '@markuplint/pug-parser' } },
			true,
		);
		// The br tag is removed but the preceding whitespace (newline + tab) remains
		expect(fixedCode).toBe('p\n\tbr\n\t');
	});

	test('[no-consecutive-br-fix-005] fix: Markdown raw HTML remove consecutive br', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'Paragraph\n\n<p>text<br><br></p>\n',
			{ parser: { '.*': '@markuplint/markdown-parser' } },
			true,
		);
		expect(fixedCode).toBe('Paragraph\n\n<p>text<br></p>\n');
	});
});
