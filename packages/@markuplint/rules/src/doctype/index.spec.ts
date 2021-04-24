import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

test('valid', async () => {
	await testAsyncAndSyncVerify(
		`
		<!doctype html>
		<html></html>
		`,
		{
			rules: {
				doctype: true,
			},
		},
		[rule],
		'en',
	);
});

test('missing doctype', async () => {
	await testAsyncAndSyncVerify(
		'<html></html>',
		{
			rules: {
				doctype: true,
			},
		},
		[rule],
		'en',
		[
			{
				severity: 'error',
				message: 'Required doctype',
				line: 1,
				col: 1,
				raw: '',
				ruleId: 'doctype',
			},
		],
	);
});

test('document fragment', async () => {
	await testAsyncAndSyncVerify(
		'<div></div>',
		{
			rules: {
				doctype: true,
			},
		},
		[rule],
		'en',
	);
});

test('obsolete doctypes', async () => {
	await testAsyncAndSyncVerify(
		`
		<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
		<div></div>
		`,
		{
			rules: {
				doctype: 'never',
			},
		},
		[rule],
		'en',
		[
			{
				severity: 'error',
				raw: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">',
				line: 2,
				col: 3,
				message: 'Never declarate obsolete doctype',
				ruleId: 'doctype',
			},
		],
	);
});
