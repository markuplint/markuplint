import test from 'ava';
import * as markuplint from '../lib/';

test('foo', async t => {
	const r = await markuplint.verifyFile('./src/test/001.html');
	t.deepEqual(r, []);
});

test('foo', async t => {
	const r = await markuplint.verifyFile('./src/test/002.html');
	t.deepEqual(r, [
		{
			line: 2,
			col: 6,
			message: 'Attribute value is must quote on double',
			raw: 'lang=en',
		},
		{
			line: 4,
			col: 7,
			message: 'Attribute value is must quote on double',
			raw: 'charset=UTF-8',
		},
		{
			line: 5,
			col: 7,
			message: 'Attribute value is must quote on double',
			raw: 'name=viewport',
		},
		{
			line: 6,
			col: 7,
			message: 'Attribute value is must quote on double',
			raw: 'http-equiv=X-UA-Compatible',
		},
		{
			line: 6,
			col: 34,
			message: 'Attribute value is must quote on double',
			raw: 'content=ie',
		},
	]);
});
