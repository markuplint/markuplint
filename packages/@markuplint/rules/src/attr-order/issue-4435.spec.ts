import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const config = {
	parser: { '.*': '@markuplint/jsx-parser' },
	rule: { options: { order: ['id', 'class', 'type'] }, severity: 'warning' },
	pretenders: [
		{
			selector: 'Btn',
			as: {
				element: 'button',
				attrs: [
					{ name: 'type', value: 'button' },
					{ name: 'id', value: 'a' },
				],
			},
		},
	],
} as any;

test('[attr-order-issue-4435-001] attributes that a pretender made are not in the source, so their order is not checked', async () => {
	const { violations } = await mlRuleTest(rule, '<Btn />', config);
	expect(violations).toStrictEqual([]);
});

test('[attr-order-issue-4435-002] attributes that a pretender takes over from the source are still checked', async () => {
	const { violations } = await mlRuleTest(rule, '<Btn type="button" id="b" />', {
		...config,
		pretenders: [{ selector: 'Btn', as: { element: 'button', inheritAttrs: true } }],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 20,
			message: '"id" should be before "type"',
			raw: 'id',
		},
	]);
});
