import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const parser = { '.*': '@markuplint/jsx-parser' };

test('[require-owned-elements-issue-4789-001] JSX: an element whose role is not known until it is rendered does not need what its implicit role needs', async () => {
	const source = [
		'<>',
		'<ul role={props.role}><div>x</div></ul>',
		'<ul {...props}><div>y</div></ul>',
		'<ul role="list" {...props}><div>z</div></ul>',
		'</>',
	].join('\n');
	expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

	// Control: the role that the markup tells is judged
	const { violations } = await mlRuleTest(rule, '<ul><div>x</div></ul>', { parser });
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "list" role expects the "listitem" role',
			raw: '<ul>',
		},
	]);
});

test('[require-owned-elements-issue-4789-002] JSX: a child whose role is not known until it is rendered may be the owned role', async () => {
	const source = [
		'<>',
		'<ul><div role={props.role}>x</div></ul>',
		'<ul><div {...props}>y</div></ul>',
		// `group` is not the owned role: the spread after it may bring `listitem`
		'<ul><div role="group" {...props}>z</div></ul>',
		'</>',
	].join('\n');
	expect((await mlRuleTest(rule, source, { parser })).violations).toStrictEqual([]);

	// Control: a child that has no attribute that may change, and whose role the markup tells, is judged
	expect((await mlRuleTest(rule, '<ul><div role="group">x</div></ul>', { parser })).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "list" role expects the "listitem" role',
			raw: '<ul>',
		},
	]);
});

test('[require-owned-elements-issue-4789-003] JSX: the role that the element has is the one written where no spread attribute is after it', async () => {
	expect(
		(await mlRuleTest(rule, '<ul role="list" {...props}><div>x</div></ul>', { parser })).violations,
	).toStrictEqual([]);

	// Control: the spread is before the `role` attribute, so the role is the one written
	expect(
		(await mlRuleTest(rule, '<ul {...props} role="list"><div>x</div></ul>', { parser })).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			message: 'The "list" role expects the "listitem" role',
			raw: '<ul {...props} role="list">',
		},
	]);
});
