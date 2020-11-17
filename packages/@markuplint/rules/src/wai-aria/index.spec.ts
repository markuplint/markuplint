import * as markuplint from 'markuplint';
import rule from './';

test('Not exist', async () => {
	const r = await markuplint.verify(
		'<div role="hoge"></div>',
		{
			rules: {
				'wai-aria': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'wai-aria',
			severity: 'error',
			line: 1,
			col: 6,
			message: 'This "hoge" role does not exist in WAI-ARIA.',
			raw: 'role="hoge"',
		},
	]);
});

test('Abstract role', async () => {
	const r = await markuplint.verify(
		'<div role="roletype"></div>',
		{
			rules: {
				'wai-aria': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'wai-aria',
			severity: 'error',
			line: 1,
			col: 6,
			message: 'This "roletype" role is the abstract role.',
			raw: 'role="roletype"',
		},
	]);
});

test('Bad state/property', async () => {
	const r = await markuplint.verify(
		'<div role="alert" aria-disabled="true"></div>',
		{
			rules: {
				'wai-aria': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'wai-aria',
			severity: 'error',
			line: 1,
			col: 19,
			message: 'The aria-disabled state/property cannot use on the alert role.',
			raw: 'aria-disabled="true"',
		},
	]);
});

test('No permitted', async () => {
	const r = await markuplint.verify(
		'<script role="link"></script>',
		{
			rules: {
				'wai-aria': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'wai-aria',
			severity: 'error',
			line: 1,
			col: 9,
			message: 'The ARIA Role of the script element cannot overwrite according to ARIA in HTML spec.',
			raw: 'role="link"',
		},
	]);
});
