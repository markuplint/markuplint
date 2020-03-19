import * as markuplint from 'markuplint';
import rule from './';

test('valid', async () => {
	const r = await markuplint.verify(
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
	expect(r.length).toBe(0);
});

test('missing doctype', async () => {
	const r = await markuplint.verify(
		'<html></html>',
		{
			rules: {
				doctype: true,
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'Required doctype',
			line: 1,
			col: 1,
			raw: '',
			ruleId: 'doctype',
		},
	]);
});

test('document fragment', async () => {
	const r = await markuplint.verify(
		'<div></div>',
		{
			rules: {
				doctype: true,
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});

test('obsolete doctypes', async () => {
	const r = await markuplint.verify(
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
	expect(r[0]).toStrictEqual({
		severity: 'error',
		raw: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">',
		line: 2,
		col: 3,
		message: 'Never declarate obsolete doctype',
		ruleId: 'doctype',
	});
});
