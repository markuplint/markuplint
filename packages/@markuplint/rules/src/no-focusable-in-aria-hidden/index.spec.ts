import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

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

describe('aria-hidden is looked for in the tree of the element', () => {
	const message = 'It may be focusable in spite of it has the ancestor that has aria-hidden=true';

	test('[no-focusable-in-aria-hidden-issue-4506-001] aria-hidden outside of the content of a template is not an ancestor', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div aria-hidden="true"><template><button>x</button></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-focusable-in-aria-hidden-issue-4506-002] aria-hidden in the content of a template is an ancestor', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div aria-hidden="true"><button>x</button></div></template>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 35,
				raw: '<button>',
				message,
			},
		]);
	});

	test('[no-focusable-in-aria-hidden-issue-4506-003] aria-hidden of the host is an ancestor of a declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div aria-hidden="true"><template shadowrootmode="open"><button>x</button></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 57,
				raw: '<button>',
				message,
			},
		]);
	});

	test('[no-focusable-in-aria-hidden-issue-4506-004] aria-hidden of an ancestor of the host is an ancestor of a declarative shadow root', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<section aria-hidden="true"><div><template shadowrootmode="open"><button>x</button></template></div></section>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 66,
				raw: '<button>',
				message,
			},
		]);
	});
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
