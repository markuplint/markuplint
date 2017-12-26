import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-deprecated-element';

const rule = new CustomRule();

test('normal', async (t) => {
	const r = await markuplint.verify(
		'<div></div><p><span></span></p>',
		{rules: {'deprecated-element': true}},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('deprecated', async (t) => {
	const r = await markuplint.verify(
		'<font></font><big><blink></blink></big>',
		{rules: {'deprecated-element': true}},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('deprecated', async (t) => {
	const r = await markuplint.verify(
		'<font></font><big><blink></blink></big>',
		{rules: {'deprecated-element': true}, extends: 'markuplint/html-ls'},
		[rule],
		'en',
	);
	t.deepEqual(r, [
		{
			level: 'error',
			message: 'Element is deprecated',
			line: 1,
			col: 2,
			raw: 'font',
			ruleId: 'deprecated-element',
		},
		{
			level: 'error',
			message: 'Element is deprecated',
			line: 1,
			col: 15,
			raw: 'big',
			ruleId: 'deprecated-element',
		},
		{
			level: 'error',
			message: 'Element is deprecated',
			line: 1,
			col: 20,
			raw: 'blink',
			ruleId: 'deprecated-element',
		},
	]);
});

test('noop', (t) => t.pass());
