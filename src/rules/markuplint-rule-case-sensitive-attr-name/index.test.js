import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-case-sensitive-attr-name';

test('lower case', async (t) => {
	const r = await markuplint.verify(
		'<div data-lowercase></div>',
		{rules: {'case-sensitive-attr-name': true}},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('upper case', async (t) => {
	const r = await markuplint.verify(
		'<div data-UPPERCASE="value"></div>',
		{rules: {'case-sensitive-attr-name': true}},
		[rule],
		'en',
	);
	t.is(r[0].level, 'warning');
	t.is(r[0].message, 'Attribute name of HTML should be lowercase');
	t.is(r[0].raw, 'data-UPPERCASE');
});

test('upper case', async (t) => {
	const r = await markuplint.verify(
		'<div data-UPPERCASE="value"></div>',
		{rules: {'case-sensitive-attr-name': ['error', 'upper']}},
		[rule],
		'en',
	);
	t.is(r[0].level, 'error');
	t.is(r[0].message, 'Attribute name of HTML must be uppercase');
});

test('upper case', async (t) => {
	const r = await markuplint.verify(
		'<div data-uppercase="value"></div>',
		{rules: {'case-sensitive-attr-name': ['error', 'upper']}},
		[rule],
		'en',
	);
	t.is(r[0].level, 'error');
	t.is(r[0].message, 'Attribute name of HTML must be uppercase');
});

test('upper case', async (t) => {
	const r = await markuplint.verify(
		'<div DATA-UPPERCASE="value"></div>',
		{rules: {'case-sensitive-attr-name': ['error', 'upper']}},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('foreign elements', async (t) => {
	const r = await markuplint.verify(
		'<svg viewBox="0 0 100 100"></svg>',
		{rules: {'case-sensitive-attr-name': true}},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('noop', (t) => t.pass());
