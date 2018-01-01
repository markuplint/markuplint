import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-permitted-role';

const rule = new CustomRule();
test('lower case', async (t) => {
	const r = await markuplint.verify(
		'<a role="button"></a>',
		{rules: {'permitted-role': true}, extends: 'markuplint/html-ls'},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('lower case', async (t) => {
	const r = await markuplint.verify(
		'<a role="document"></a>',
		{rules: {'permitted-role': true}, extends: 'markuplint/html-ls'},
		[rule],
		'en',
	);
	t.is(r[0].message, 'This value of "role" attribute is not permitted');
});

test('noop', (t) => t.pass());
