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
			message: 'error',
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

test('test', async () => {
	const r = await markuplint.verify(
		`
		<!doctype html>
		<html></html>
		`,
		{
			rules: {
				doctype: 'never',
			},
		},
		[rule],
		'en',
	);
	expect(r).toStrictEqual([
		{
			severity: 'error',
			message: 'error',
			line: 1,
			col: 1,
			raw: '',
			ruleId: 'doctype',
		},
	]);
});

test('"never"', async () => {
	const r = await markuplint.verify(
		'<html></html>',
		{
			rules: {
				doctype: 'never',
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});

test('"never" in document fragment', async () => {
	const r = await markuplint.verify(
		'<div></div>',
		{
			rules: {
				doctype: 'never',
			},
		},
		[rule],
		'en',
	);
	expect(r.length).toBe(0);
});
