import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-id-duplication';

test('id-duplication', async (t) => {
	const r = await markuplint.verify(
		'<div id="a"><p id="a"></p></div>',
		{rules: {'id-duplication': true}},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'Duplicate attribute id value',
			line: 1,
			col: 16,
			raw: 'id="a"',
			ruleId: 'id-duplication',
		},
	]);
});

test('id-duplication', async (t) => {
	const r = await markuplint.verify(
		'<div id="a"></div>',
		{rules: {'id-duplication': true}},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('id-duplication', async (t) => {
	const r = await markuplint.verify(
		'<div id="a"></div><div id="a"></div><div id="a"></div>',
		{rules: {'id-duplication': true}},
		[rule],
		'en',
	);
	t.is(r.length, 2);
});

test('id-duplication', async (t) => {
	const r = await markuplint.verify(
		'<div id="a"></div><div id="b"></div><div id="c"></div>',
		{rules: {'id-duplication': true}},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('noop', (t) => t.pass());
