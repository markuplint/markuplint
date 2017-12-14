import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-id-duplication';

const rule = new CustomRule();

test('id-duplication', async t => {
	const r = await markuplint.verify(
		`<div id="a"><p id="a"></p></div>`,
		{rules: {"id-duplication": true}},
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
		}
	]);
});

test('noop', t => t.pass());
