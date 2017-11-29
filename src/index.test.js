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
			level: 'error',
			message: 'Attribute value is must quote on double',
			line: 2,
			col: 6,
			raw: 'lang=en',
		},
		{
			level: 'error',
			message: 'Attribute value is must quote on double',
			line: 4,
			col: 7,
			raw: 'charset=UTF-8',
		},
		{
			level: 'error',
			message: 'Attribute value is must quote on double',
			line: 5,
			col: 7,
			raw: 'name=viewport',
		},
		{
			level: 'error',
			message: 'Attribute value is must quote on double',
			line: 5,
			col: 21,
			raw: "content='width=device-width, initial-scale=1.0'",
		},
		{
			level: 'error',
			message: 'Attribute value is must quote on double',
			line: 6,
			col: 7,
			raw: 'http-equiv=X-UA-Compatible',
		},
		{
			level: 'error',
			message: 'Attribute value is must quote on double',
			line: 6,
			col: 34,
			raw: 'content=ie',
		},
	]);
});
