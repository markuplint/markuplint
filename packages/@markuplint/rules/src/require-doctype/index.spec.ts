import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-doctype-valid-001] valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
		<!doctype html>
		<html></html>
		`,
	);
	expect(violations.length).toBe(0);
});

test('[require-doctype-invalid-001] missing doctype', async () => {
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

test('[require-doctype-valid-002] document fragment', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div>');
	expect(violations.length).toBe(0);
});

test('[require-doctype-valid-003] an obsolete doctype still counts as present', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
		<div></div>
		`,
	);
	expect(violations.length).toBe(0);
});
