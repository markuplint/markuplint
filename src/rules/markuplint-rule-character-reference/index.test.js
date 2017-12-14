import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-character-reference';

const rule = new CustomRule();

test('character-reference', async t => {
	const r = await markuplint.verify(
		`<div id="a"> > < & " ' &amp;</div>`,
		{rules: {"character-reference": true}},
		[rule],
		'en',
	);
	t.is(r.length, 4);
	t.deepEqual(r[0], {
		level: 'error',
		message: 'Illegal characters must escape in character reference',
		line: 1,
		col: 14,
		raw: '>',
		ruleId: 'character-reference',
	});
	t.is(r[1].col, 16);
	t.is(r[1].raw, '<');
	t.is(r[2].col, 18);
	t.is(r[2].raw, '&');
	t.is(r[3].col, 20);
	t.is(r[3].raw, '"');
});

test('character-reference', async t => {
	const r = await markuplint.verify(
		`<img src="path/to?a=b&c=d">`,
		{rules: {"character-reference": true}},
		[rule],
		'en',
	);
	t.deepEqual(r, [{
		level: 'error',
		message: 'Illegal characters must escape in character reference',
		line: 1,
		col: 22,
		raw: '&',
		ruleId: 'character-reference',
	}]);
});

test('character-reference', async t => {
	const r = await markuplint.verify(
		`<script>if (i < 0) console.log("<markuplint>");</script>`,
		{rules: {"character-reference": true}},
		[rule],
		'en',
	);
	t.is(r.length, 0);
});

test('noop', t => t.pass());
