import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-character-reference';

const rule = new CustomRule();

test('character-reference', async t => {
	const r = await markuplint.verify(
		`<div id="a"> > < & " ' </div>`,
		{rules: {"character-reference": true}},
		[rule],
		'en',
	);
	t.deepEqual(r[0], {
		level: 'error',
		message: 'Illegal characters in node or attribute value must be escape in character reference',
		line: 1,
		col: 20,
		raw: '"',
	});
	t.is(r[1].col, 18);
	t.is(r[1].raw, '&');
	t.is(r[2].col, 16);
	t.is(r[2].raw, '<');
	t.is(r[3].col, 14);
	t.is(r[3].raw, '>');
});

test('noop', t => t.pass());
