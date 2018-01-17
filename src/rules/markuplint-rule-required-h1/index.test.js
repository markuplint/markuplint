import test from 'ava';
import * as markuplint from '../../../lib/';
import rule from '../../../lib/rules/markuplint-rule-required-h1';

// test(async (t) => {
// 	const r = await markuplint.verify(
// 		'<html><body>text</body></html>',
// 		{rules: {'required-h1': true}},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'error',
// 			message: 'Missing h1 element',
// 			line: 1,
// 			col: 1,
// 			raw: '<',
// 			ruleId: 'required-h1',
// 		},
// 	]);
// });

// test(async (t) => {
// 	const r = await markuplint.verify(
// 		'<html><body><h1>text</h1></body></html>',
// 		{rules: {'required-h1': true}},
// 		[rule],
// 		'en',
// 	);
// 	t.is(r.length, 0);
// });

// test(async (t) => {
// 	const r = await markuplint.verify(
// 		'<html><body><h1>text</h1><h1>text</h1></body></html>',
// 		{rules: {'required-h1': true}},
// 		[rule],
// 		'en',
// 	);
// 	t.deepEqual(r, [
// 		{
// 			level: 'error',
// 			message: 'Duplicate h1 element',
// 			line: 1,
// 			col: 26,
// 			raw: '<h1>',
// 			ruleId: 'required-h1',
// 		},
// 	]);
// });

// test(async (t) => {
// 	const r = await markuplint.verify(
// 		'<html><body><h1>text</h1><h1>text</h1></body></html>',
// 		{rules: {'required-h1': ['error', true, { 'expected-once': false }]}},
// 		[rule],
// 		'en',
// 	);
// 	t.is(r.length, 0);
// });

test('noop', (t) => t.pass());
