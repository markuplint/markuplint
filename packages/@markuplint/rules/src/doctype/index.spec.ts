import { mlTest } from 'markuplint';

import rule from './';

test('valid', async () => {
	const { violations } = await mlTest(
		`
		<!doctype html>
		<html></html>
		`,
		{
			rules: {
				doctype: true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});

test('missing doctype', async () => {
	const { violations } = await mlTest(
		'<html></html>',
		{
			rules: {
				doctype: true,
			},
		},
		[rule],
		'en',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'Require doctype',
			line: 1,
			col: 1,
			raw: '',
			ruleId: 'doctype',
		},
	]);
});

test('document fragment', async () => {
	const { violations } = await mlTest(
		'<div></div>',
		{
			rules: {
				doctype: true,
			},
		},
		[rule],
		'en',
	);
	expect(violations.length).toBe(0);
});

test('obsolete doctypes', async () => {
	const { violations } = await mlTest(
		`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
		<div></div>
		`,
		{
			rules: {
				doctype: 'never',
			},
		},
		[rule],
		'en',
	);
	expect(violations[0]).toStrictEqual({
		severity: 'error',
		raw: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">',
		line: 2,
		col: 3,
		message: 'Never declarate obsolete doctype',
		ruleId: 'doctype',
	});
});
