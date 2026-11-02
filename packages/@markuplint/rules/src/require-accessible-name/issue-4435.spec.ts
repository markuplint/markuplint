import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-accessible-name-issue-4435-001] a boolean attribute that the framework does not output does not make the element mutable', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled={false}></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<button disabled={false}>' },
	]);
});

test('[require-accessible-name-issue-4435-002] code that is not a literal may change the element', async () => {
	const { violations } = await mlRuleTest(rule, '<button disabled={cond}></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4435-003] a component that no pretender resolved renders what is not known', async () => {
	const { violations } = await mlRuleTest(rule, '<button><Icon /></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4435-004] a component with a literal prop is the same', async () => {
	const { violations } = await mlRuleTest(rule, '<button><Icon size={16} /></button>', {
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[require-accessible-name-issue-4435-005] an element without a name is reported', async () => {
	const { violations } = await mlRuleTest(rule, '<button></button>', { parser: { '.*': '@markuplint/jsx-parser' } });
	expect(violations).toStrictEqual([
		{ severity: 'error', line: 1, col: 1, message: 'Require accessible name', raw: '<button>' },
	]);
});
