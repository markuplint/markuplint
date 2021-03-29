import * as markuplint from 'markuplint';
import rule from './';

describe("Use the role that doesn't exist in the spec", () => {
	test('[role=hoge]', async () => {
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
});

describe('Use the abstract role', () => {
	test('[role=roletype]', async () => {
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
});

describe("Use the `aria-*` attribute that doesn't belong to a set role (or an implicit role)", () => {
	test('[role=alert][aria-disabled=true]', async () => {
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
				message: 'The aria-disabled state/property is deprecated on the alert role.',
				raw: 'aria-disabled="true"',
			},
		]);
	});

	test('[aria-checked=true]', async () => {
		const r = await markuplint.verify(
			'<div aria-checked="true"></div>',
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
				message: 'The aria-checked is not global state/property.',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('button[aria-checked=true]', async () => {
		const r = await markuplint.verify(
			'<button aria-checked="true"></button>',
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
				message: 'Cannot use the aria-checked state/property on the button role.',
				raw: 'aria-checked="true"',
			},
		]);
	});

	test('button[aria-pressed=true]', async () => {
		const r = await markuplint.verify(
			'<button aria-pressed="true"></button>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(r.length).toBe(0);
	});
});

describe('Use a bad value of the `aria-*` attribute', () => {
	test('[aria-current=foo]', async () => {
		const r = await markuplint.verify(
			'<div aria-current="foo"></div>',
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
				message:
					'The "foo" is disallowed in the aria-current state/property. Allow values are page, step, location, date, time, true, false.',
				raw: 'aria-current="foo"',
			},
		]);
	});

	test('[aria-current=page]', async () => {
		const r = await markuplint.verify(
			'<div aria-current="page"></div>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(r.length).toBe(0);
	});

	test('disabled', async () => {
		const r = await markuplint.verify(
			'<div aria-current="foo"></div>',
			{
				rules: {
					'wai-aria': {
						option: {
							checkingValue: false,
						},
					},
				},
			},
			[rule],
			'en',
		);

		expect(r.length).toBe(0);
	});
});

describe('Use the not permitted role according to ARIA in HTML', () => {
	test('script[role=link]', async () => {
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

	test('a[role=document]', async () => {
		const r = await markuplint.verify(
			'<a href role="document"></a>',
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
				message: 'The ARIA Role of the a element cannot overwrite "document" according to ARIA in HTML spec.',
				raw: 'role="document"',
			},
		]);
	});

	test('disabled', async () => {
		const r = await markuplint.verify(
			'<script role="link"></script>',
			{
				rules: {
					'wai-aria': {
						option: {
							permittedAriaRoles: false,
						},
					},
				},
			},
			[rule],
			'en',
		);

		expect(r.length).toBe(0);
	});
});

describe('Set the implicit role explicitly', () => {
	test('a[href][role=link]', async () => {
		const r = await markuplint.verify(
			'<a href="path/to" role="link"></a>',
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
				message:
					'Don\'t set the implicit role explicitly because the "link" role is the implicit role of the a element.',
				raw: 'role="link"',
			},
		]);
	});

	test('header[role=banner]', async () => {
		const r = await markuplint.verify(
			'<header role="banner"></header>',
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
				message:
					'Don\'t set the implicit role explicitly because the "banner" role is the implicit role of the header element.',
				raw: 'role="banner"',
			},
		]);

		const r2 = await markuplint.verify(
			'<header role="banner"><article></article></header>',
			{
				rules: {
					'wai-aria': true,
				},
			},
			[rule],
			'en',
		);

		expect(r2).toStrictEqual([
			{
				ruleId: 'wai-aria',
				severity: 'error',
				line: 1,
				col: 9,
				message:
					'The ARIA Role of the header element cannot overwrite "banner" according to ARIA in HTML spec.',
				raw: 'role="banner"',
			},
		]);
	});

	test('disabled', async () => {
		const r = await markuplint.verify(
			'<a href="path/to" role="link"></a>',
			{
				rules: {
					'wai-aria': {
						option: {
							disallowSetImplicitRole: false,
						},
					},
				},
			},
			[rule],
			'en',
		);

		expect(r.length).toBe(0);
	});
});

describe('childNodeRules', () => {
	test('ex. For Safari + VoiceOver', async () => {
		const r = await markuplint.verify(
			'<img src="path/to.svg" alt="text" role="img" />',
			{
				rules: {
					'wai-aria': true,
				},
				nodeRules: [
					{
						selector: 'img[src$=.svg]',
						rules: {
							'wai-aria': {
								option: {
									disallowSetImplicitRole: false,
								},
							},
						},
					},
				],
			},
			[rule],
			'en',
		);

		expect(r.length).toBe(0);
	});
});
