import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
		<!doctype html>
		<html></html>
		`,
	);
	expect(violations.length).toBe(0);
});

test('missing doctype', async () => {
	const { violations } = await mlRuleTest(rule, '<html></html>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'Require doctype',
			line: 1,
			col: 1,
			raw: '',
		},
	]);
});

test('document fragment', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div>');
	expect(violations.length).toBe(0);
});

test('obsolete doctypes', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
		<div></div>
		`,
		{ rule: 'always' },
	);
	expect(violations[0]).toStrictEqual({
		severity: 'error',
		raw: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">',
		line: 2,
		col: 3,
		message: 'Never declare obsolete doctype',
	});
});
