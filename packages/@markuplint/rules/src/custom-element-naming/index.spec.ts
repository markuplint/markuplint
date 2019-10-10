import * as markuplint from 'markuplint';
import rule from './';

describe('verify', () => {
	test('pass <x-tag>', async () => {
		const r = await markuplint.verify(
			'<x-tag></x-tag>',
			{
				rules: {
					'custom-element-naming': '^x-[a-z]+$',
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('fail <z-tag>', async () => {
		const r = await markuplint.verify(
			'<z-tag></z-tag>',
			{
				rules: {
					'custom-element-naming': '^x-[a-z]+$',
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				ruleId: 'custom-element-naming',
				severity: 'warning',
				line: 1,
				col: 1,
				raw: '<z-tag>',
				message: 'Invalid custom element name. Expected pattern is /^x-[a-z]+$/',
			},
		]);
	});

	test('pass <x-tag> and <z-tag>', async () => {
		const r = await markuplint.verify(
			'<x-tag><z-tag /></x-tag>',
			{
				rules: {
					'custom-element-naming': '^(x|z)-[a-z]+$',
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([]);
	});

	test('fail <y-tag>', async () => {
		const r = await markuplint.verify(
			'<x-tag><z-tag /><y-tag /></x-tag>',
			{
				rules: {
					'custom-element-naming': '^(x|z)-[a-z]+$',
				},
			},
			[rule],
			'en',
		);
		expect(r).toStrictEqual([
			{
				ruleId: 'custom-element-naming',
				severity: 'warning',
				line: 1,
				col: 17,
				raw: '<y-tag />',
				message: 'Invalid custom element name. Expected pattern is /^(x|z)-[a-z]+$/',
			},
		]);
	});
});
