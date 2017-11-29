import test from 'ava';
import * as markuplint from '../../lib/';
import CustomRule from '../../lib/rules/markuplint-rule-verify-permitted-contents';

const rule = new CustomRule();
const ruleset = require('../../rulesets/html-ls.json');

test('HTML Living Standard empty document', async t => {
	const r = await markuplint.verify(``, ruleset, [rule]);
	t.deepEqual(r, [
		{
			level: 'error',
			message: '<#doctype> is required that is premitted content of <#root>.',
			line: 0,
			col: 0,
			raw: '',
		},
		{
			level: 'error',
			message: '<html> is required that is premitted content of <#root>.',
			line: 0,
			col: 0,
			raw: '',
		},
	]);
});

test('HTML Living Standard empty html', async t => {
	const r = await markuplint.verify(`
		<!DOCTYPE html>
		<html></html>
	`, ruleset, [rule]);
	t.deepEqual(r, [
		{
			level: 'error',
			message: '<head> is required that is premitted content of <html>.',
			line: 0,
			col: 0,
			raw: '',
		},
		{
			level: 'error',
			message: '<body> is required that is premitted content of <html>.',
			line: 0,
			col: 0,
			raw: '',
		},
	]);
});

test('noop', t => t.pass());
