import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[tab-requires-tabpanel-valid-001] active tab with aria-controls pointing to a tabpanel', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="tablist"><button role="tab" aria-selected="true" aria-controls="panel">Tab</button></div><div id="panel" role="tabpanel">Content</div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[tab-requires-tabpanel-valid-002] active tab referenced by a tabpanel via aria-labelledby', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="tablist"><button id="tab1" role="tab" aria-selected="true">Tab</button></div><div role="tabpanel" aria-labelledby="tab1">Content</div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[tab-requires-tabpanel-valid-003] inactive tab does not require a tabpanel', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="tablist"><button role="tab" aria-selected="false">Tab</button></div>',
	);
	expect(violations).toStrictEqual([]);
});

test('[tab-requires-tabpanel-valid-004] tab without aria-selected does not require a tabpanel', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="tablist"><button role="tab">Tab</button></div>');
	expect(violations).toStrictEqual([]);
});

test('[tab-requires-tabpanel-valid-005] non-tab role is ignored', async () => {
	const { violations } = await mlRuleTest(rule, '<button aria-selected="true">Not a tab</button>');
	expect(violations).toStrictEqual([]);
});

test('[tab-requires-tabpanel-invalid-001] active tab with no tabpanel anywhere in the document', async () => {
	// Mirrors tests/external/validator/tests/html-aria/misc/role-tab-with-no-role-tabpanel-novalid.html
	const { violations } = await mlRuleTest(
		rule,
		'<div role="tablist">\n  <button role="tab" aria-selected="false">foo</button>\n  <button role="tab" aria-selected="true">bar</button>\n</div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 3,
			col: 3,
			message: 'An active "tab" role requires a corresponding "tabpanel" role',
			raw: '<button role="tab" aria-selected="true">',
		},
	]);
});

test('[tab-requires-tabpanel-invalid-002] aria-controls points to a non-tabpanel element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="tablist"><button role="tab" aria-selected="true" aria-controls="notpanel">Tab</button></div><div id="notpanel">Not a panel</div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 21,
			message: 'An active "tab" role requires a corresponding "tabpanel" role',
			raw: '<button role="tab" aria-selected="true" aria-controls="notpanel">',
		},
	]);
});

test('[tab-requires-tabpanel-invalid-003] tabpanel aria-labelledby references a different tab', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="tablist"><button id="tab1" role="tab" aria-selected="true">Tab</button></div><div role="tabpanel" aria-labelledby="othertab">Content</div>',
	);
	expect(violations.length).toBe(1);
	expect(violations[0]!.message).toBe('An active "tab" role requires a corresponding "tabpanel" role');
});
