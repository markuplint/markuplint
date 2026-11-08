import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-focusable-in-aria-hidden-valid-001] no aria-hidden', async () => {
	expect((await mlRuleTest(rule, '<button>click</button>')).violations).toStrictEqual([]);
});

test('[no-focusable-in-aria-hidden-valid-002] non-interactive in hidden', async () => {
	expect((await mlRuleTest(rule, '<div aria-hidden="true"><span>text</span></div>')).violations).toStrictEqual([]);
});

test('[no-focusable-in-aria-hidden-issue-4180-001] an upper-case ARIA-HIDDEN attribute name is matched', async () => {
	const { violations } = await mlRuleTest(rule, '<div ARIA-HIDDEN="true"><button>click</button></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('warning');
});

test('[no-focusable-in-aria-hidden-invalid-001] focusable in hidden', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-hidden="true"><button>click</button></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('warning');
});

test('[no-focusable-in-aria-hidden-invalid-002] the message for aria-hidden on the element itself is translated into Japanese', async () => {
	const { violations } = await mlRuleTest(rule, '<button aria-hidden="true">click</button>', undefined, false, 'ja');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			raw: '<button aria-hidden="true">',
			message: 'aria-hidden=trueを持っていますが、フォーカスできてしまうかもしれません',
		},
	]);
});

test('[no-focusable-in-aria-hidden-invalid-003] the message for aria-hidden on an ancestor is translated into Japanese', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div aria-hidden="true"><button>click</button></div>',
		undefined,
		false,
		'ja',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 25,
			raw: '<button>',
			message: '先祖がaria-hidden=trueを持っていますが、フォーカスできてしまうかもしれません',
		},
	]);
});
