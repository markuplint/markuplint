import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-doctype';

test(async (t) => {
	const r = await markuplint.verify(
		`
		<!doctype html>
		<html></html>
		`,
		{
			rules: {
				'doctype': true,
			},
		},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test(async (t) => {
	const r = await markuplint.verify(
		'<html></html>',
		{
			rules: {
				'doctype': true,
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'error',
			line: 1,
			col: 1,
			raw: '',
			ruleId: 'doctype',
		},
	]);
});

test(async (t) => {
	const r = await markuplint.verify(
		'<div></div>',
		{
			rules: {
				'doctype': true,
			},
		},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test(async (t) => {
	const r = await markuplint.verify(
		`
		<!doctype html>
		<html></html>
		`,
		{
			rules: {
				'doctype': 'never',
			},
		},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			severity: 'error',
			message: 'error',
			line: 1,
			col: 1,
			raw: '',
			ruleId: 'doctype',
		},
	]);
});

test(async (t) => {
	const r = await markuplint.verify(
		'<html></html>',
		{
			rules: {
				'doctype': 'never',
			},
		},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test(async (t) => {
	const r = await markuplint.verify(
		'<div></div>',
		{
			rules: {
				'doctype': 'never',
			},
		},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('noop', (t) => t.pass());
