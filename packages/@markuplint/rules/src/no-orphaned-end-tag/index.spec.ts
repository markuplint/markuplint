import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-orphaned-end-tag-invalid-001] It is test', async () => {
	const { violations } = await mlRuleTest(rule, '<div></p></br><p></span></p></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			raw: '</p>',
			message: 'Orphaned end tag detected',
		},
		{
			severity: 'error',
			line: 1,
			col: 10,
			raw: '</br>',
			message: 'Orphaned end tag detected',
		},
		{
			severity: 'error',
			line: 1,
			col: 18,
			raw: '</span>',
			message: 'Orphaned end tag detected',
		},
	]);
});

test('[no-orphaned-end-tag-issue-1575] #1575: orphaned end tag with newlines', async () => {
	const { violations } = await mlRuleTest(rule, '<div>\n  </p>\n</div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 3,
			raw: '</p>',
			message: 'Orphaned end tag detected',
		},
	]);
});

describe('fix', () => {
	test('[no-orphaned-end-tag-fix-001] remove orphaned end tag', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div></div></span>', undefined, true);
		expect(fixedCode).toBe('<div></div>');
	});

	test('[no-orphaned-end-tag-fix-002] remove multiple orphaned end tags', async () => {
		const { fixedCode } = await mlRuleTest(rule, '<div></p></br><p></span></p></div>', undefined, true);
		expect(fixedCode).toBe('<div><p></p></div>');
	});
});
