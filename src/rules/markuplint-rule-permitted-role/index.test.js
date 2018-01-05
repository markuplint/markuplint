import test from 'ava';
import * as markuplint from '../../../lib/';
import CustomRule from '../../../lib/rules/markuplint-rule-permitted-role';

const rule = new CustomRule();
test('', async (t) => {
	const r = await markuplint.verify(
		'<a role="button"></a>',
		{rules: {'permitted-role': true}, extends: 'markuplint/html-ls'},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('', async (t) => {
	const r = await markuplint.verify(
		'<a role="document"></a>',
		{rules: {'permitted-role': true}, extends: 'markuplint/html-ls'},
		[rule],
		'en',
	);
	t.is(r[0].message, 'Values allowed for "role" attributes are "button", "checkbox", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "radio", "switch", "tab", "treeitem"');
});

test('', async (t) => {
	const r = await markuplint.verify(
		'<input type="button" role="link">',
		{rules: {'permitted-role': true}, extends: 'markuplint/html-ls'},
		[rule],
		'en',
	);
	t.deepEqual(r, []);
});

test('', async (t) => {
	const r = await markuplint.verify(
		'<input type="checkbox" role="tab">',
		{rules: {'permitted-role': true}, extends: 'markuplint/html-ls'},
		[rule],
		'en',
	);
	t.is(r[0].message, 'Values allowed for "role" attributes are "menuitemcheckbox", "switch", "button", "option"');
});

test('noop', (t) => t.pass());
