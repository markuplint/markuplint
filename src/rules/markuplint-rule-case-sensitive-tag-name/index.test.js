import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-case-sensitive-tag-name';

const rule = new CustomRule();
test('lower case', async (t) => {
	const r = await markuplint.verify(
		'<div data-lowercase></div>',
		{rules: {'case-sensitive-tag-name': true}},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('upper case', async (t) => {
	const r = await markuplint.verify(
		'<DIV data-lowercase></DIV>',
		{rules: {'case-sensitive-tag-name': true}},
		[rule],
		'en',
	);
	t.is(r[0].level, 'warning');
	t.is(r[0].message, 'Tag name of HTML should be lowercase');
	t.is(r[0].raw, 'DIV');
});

test('upper case', async (t) => {
	const r = await markuplint.verify(
		'<div data-UPPERCASE="value"></div>',
		{rules: {'case-sensitive-tag-name': ['error', 'upper']}},
		[rule],
		'en',
	);
	t.is(r[0].level, 'error');
	t.is(r[0].message, 'Tag name of HTML must be uppercase');
});

test('upper case', async (t) => {
	const r = await markuplint.verify(
		'<DIV data-uppercase="value"></DIV>',
		{rules: {'case-sensitive-tag-name': ['error', 'upper']}},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('upper case', async (t) => {
	const r = await markuplint.verify(
		'<DIV DATA-UPPERCASE="value"></div>',
		{rules: {'case-sensitive-tag-name': ['error', 'upper']}},
		[rule],
		'en',
	);
	t.is(r.length, 1);
});

test('foreign elements', async (t) => {
	const r = await markuplint.verify(
		'<svg viewBox="0 0 100 100"><textPath></textPath></svg>',
		{rules: {'case-sensitive-tag-name': true}},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('noop', (t) => t.pass());
