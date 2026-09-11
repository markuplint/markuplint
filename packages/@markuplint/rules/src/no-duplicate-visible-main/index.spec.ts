import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-visible-main-valid-001] single main', async () => {
	const { violations } = await mlRuleTest(rule, '<body><main>content</main></body>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-visible-main-valid-002] main with hidden main', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<body><main>content</main><main hidden>hidden content</main></body>',
	);
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-visible-main-valid-003] no main', async () => {
	const { violations } = await mlRuleTest(rule, '<body><div>content</div></body>');
	expect(violations).toStrictEqual([]);
});

test('[no-duplicate-visible-main-invalid-001] two visible mains', async () => {
	const { violations } = await mlRuleTest(rule, '<body><main>first</main><main>second</main></body>');
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<main>',
			message: 'There must not be more than one visible "main" element in a document',
		}),
	]);
});

test('[no-duplicate-visible-main-invalid-002] three mains one hidden', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<body><main>first</main><main hidden>hidden</main><main>third</main></body>',
	);
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<main>',
			col: 51,
			message: 'There must not be more than one visible "main" element in a document',
		}),
	]);
});
