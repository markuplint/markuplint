import test from 'ava';
import * as markuplint from '../../lib/';
import rule from '../../lib/rules/markuplint-rule-tag-require';

const ruleset = require('../../markuplintrc.json');

test('empty', async t => {
	const r = await markuplint.verify(``, ruleset, [rule]);
	t.deepEqual(r, [
		'html is reqired.',
		'head is reqired.',
		'title is reqired.',
		'body is reqired.',
		'h1 is reqired.',
	]);
});
