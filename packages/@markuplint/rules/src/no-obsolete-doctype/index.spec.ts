import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-obsolete-doctype-valid-001] modern doctype', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
		<!doctype html>
		<html></html>
		`,
	);
	expect(violations.length).toBe(0);
});

test('[no-obsolete-doctype-valid-002] document fragment', async () => {
	const { violations } = await mlRuleTest(rule, '<div></div>');
	expect(violations.length).toBe(0);
});

test('[no-obsolete-doctype-valid-003] missing doctype is not this rule’s concern', async () => {
	const { violations } = await mlRuleTest(rule, '<html></html>');
	expect(violations.length).toBe(0);
});

test('[no-obsolete-doctype-invalid-001] obsolete doctype', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
		<div></div>
		`,
	);
	expect(violations[0]).toStrictEqual({
		severity: 'error',
		raw: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">',
		line: 2,
		col: 3,
		message: 'Never declare obsolete doctype',
	});
});

test('[no-obsolete-doctype-valid-004] legacy-compat system identifier is a conforming exception (HTML LS)', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
		<!DOCTYPE html SYSTEM "about:legacy-compat">
		<div></div>
		`,
	);
	expect(violations.length).toBe(0);
});
