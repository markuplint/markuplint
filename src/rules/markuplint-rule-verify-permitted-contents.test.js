import test from 'ava';
import * as markuplint from '../../lib/';
import rule from '../../lib/rules/markuplint-rule-verify-permitted-contents';

const ruleset = require('../../rulesets/html-ls.json');

// test('HTML Living Standard empty document', async t => {
// 	const r = await markuplint.verify(``, ruleset, [rule]);
// 	t.deepEqual(r, [
// 		'<#doctype> is required that is premitted content of <#root>.',
// 		'<html> is required that is premitted content of <#root>.',
// 	]);
// });

// test('HTML Living Standard empty html', async t => {
// 	const r = await markuplint.verify(`
// 		<!DOCTYPE html>
// 		<html></html>
// 	`, ruleset, [rule]);
// 	t.deepEqual(r, [
// 		'<head> is required that is premitted content of <html>.',
// 		'<body> is required that is premitted content of <html>.',
// 	]);
// });

test('noop', t => t.pass());
