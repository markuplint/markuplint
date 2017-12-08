import test from 'ava';
import * as markuplint from '../lib/';

test('foo', async t => {
	const r = await markuplint.verifyFile('./src/test/001.html');
	t.deepEqual(r.reports, []);
});

test('foo', async t => {
	const r = await markuplint.verifyFile('./src/test/002.html', null, null, 'en');
	t.deepEqual(r.reports, [
		{
			level: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 6,
			raw: 'lang=en',
		},
		{
			level: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 4,
			col: 7,
			raw: 'charset=UTF-8',
		},
		{
			level: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 5,
			col: 7,
			raw: 'name=viewport',
		},
		{
			level: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 5,
			col: 21,
			raw: "content='width=device-width, initial-scale=1.0'",
		},
		{
			level: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 6,
			col: 7,
			raw: 'http-equiv=X-UA-Compatible',
		},
		{
			level: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 6,
			col: 34,
			raw: 'content=ie',
		},
	]);
});
