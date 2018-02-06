import test from 'ava';
import * as markuplint from '../lib/';

test(async (t) => {
	const r = await markuplint.verifyFile('./src/test/001.html');
	t.deepEqual(r.reports, []);
});

test(async (t) => {
	const r = await markuplint.verifyFile('./src/test/002.html', null, null, 'en');
	t.deepEqual(r.reports, [
		{
			level: 'warning',
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 2,
			col: 7,
			raw: 'lang=en',
			ruleId: 'attr-value-quotes',
		},
		{
			level: 'warning',
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 4,
			col: 8,
			raw: 'charset=UTF-8',
			ruleId: 'attr-value-quotes',
		},
		{
			level: 'warning',
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 5,
			col: 8,
			raw: 'name=viewport',
			ruleId: 'attr-value-quotes',
		},
		{
			level: 'warning',
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 5,
			col: 22,
			raw: "content='width=device-width, initial-scale=1.0'",
			ruleId: 'attr-value-quotes',
		},
		{
			level: 'warning',
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 6,
			col: 8,
			raw: 'http-equiv=X-UA-Compatible',
			ruleId: 'attr-value-quotes',
		},
		{
			level: 'warning',
			severity: 'warning',
			message: 'Attribute value is must quote on double quotation mark',
			line: 6,
			col: 35,
			raw: 'content=ie=edge',
			ruleId: 'attr-value-quotes',
		},
	]);
});

test((t) => t.pass());
