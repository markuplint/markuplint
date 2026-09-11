import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-disallowed-ancestor-invalid-001] address inside address', async () => {
	const { violations: violations1 } = await mlRuleTest(rule, '<address><address></address></address>');
	expect(violations1).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 10,
			message: 'The "address" element must not appear as a descendant of the "address" element',
			raw: '<address>',
		},
	]);

	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<address><div><div><div><address></address></div></div></div></address>',
	);
	expect(violations2).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 25,
			message: 'The "address" element must not appear as a descendant of the "address" element',
			raw: '<address>',
		},
	]);
});

test('[no-disallowed-ancestor-issue-3632-001] main must not be descendant of article', async () => {
	const { violations } = await mlRuleTest(rule, '<article><main>x</main></article>');
	expect(violations).toContainEqual(
		expect.objectContaining({
			message: 'The "main" element must not appear as a descendant of the "article" element',
		}),
	);
});

test('[no-disallowed-ancestor-issue-3632-002] main standalone is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<main>x</main>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-ancestor-issue-3632-003] main in deeply nested nav', async () => {
	const { violations } = await mlRuleTest(rule, '<nav><div><div><main>x</main></div></div></nav>');
	expect(violations).toContainEqual(
		expect.objectContaining({
			message: 'The "main" element must not appear as a descendant of the "nav" element',
		}),
	);
});

test('[no-disallowed-ancestor-issue-3632-004] footer in header', async () => {
	const { violations } = await mlRuleTest(rule, '<header><footer>x</footer></header>');
	expect(violations).toContainEqual(
		expect.objectContaining({
			message: 'The "footer" element must not appear as a descendant of the "header" element',
		}),
	);
});
