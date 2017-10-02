import test from 'ava';
import * as markuplint from '../../lib/';
import rule from '../../lib/rules/markuplint-rule-tag-require';

const ruleset = require('../../rulesets/html-ls.json');

test('empty', async t => {
	const r = await markuplint.verify(``, ruleset, [rule]);
	t.deepEqual(r, [
		'#doctype is required.',
		'html is required.',
	]);
});

test('empty', async t => {
	const r = await markuplint.verify(`
		<!doctype html>
		<html></html>
	`, ruleset, [rule]);
	t.deepEqual(r, [
		'#doctype is required.',
		'html is required.',
	]);
});
