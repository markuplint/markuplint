import { mergeConfig, mergeRule } from './merge-config';

it('test', () => {
	expect(mergeConfig({}, {})).toStrictEqual({});
});

it('test', () => {
	expect(
		mergeConfig(
			{
				plugins: ['a', 'b', 'c'],
			},
			{
				plugins: ['c', 'b', 'd'],
			},
		),
	).toStrictEqual({
		plugins: ['a', 'b', 'c', 'd'],
	});
});

it('test', () => {
	expect(
		mergeConfig(
			{
				plugins: ['a', 'b', { name: 'c', settings: { foo: 'foo', bar: 'bar' } }],
			},
			{
				plugins: ['c', 'b', 'd', { name: 'c', settings: { foo2: 'foo2', bar: 'bar2' } }],
			},
		),
	).toStrictEqual({
		plugins: [
			'a',
			'b',
			{
				name: 'c',
				settings: {
					bar: 'bar2',
					foo: 'foo',
					foo2: 'foo2',
				},
			},
			'd',
		],
	});
});

it('test', () => {
	expect(
		mergeConfig(
			{
				parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
			},
			{
				parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
			},
		),
	).toStrictEqual({
		parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
	});
});

it('test', () => {
	expect(
		mergeConfig(
			{
				parser: { '/\\.vue$/i': '@markuplint/vue-parser' },
			},
			{
				parser: { '/\\.[jt]sx?$/i': '@markuplint/jsx-parser' },
			},
		),
	).toStrictEqual({
		parser: {
			'/\\.vue$/i': '@markuplint/vue-parser',
			'/\\.[jt]sx?$/i': '@markuplint/jsx-parser',
		},
	});
});

it('test', () => {
	expect(
		mergeRule(
			{
				value: true,
			},
			{},
		),
	).toStrictEqual({
		value: true,
	});

	expect(
		mergeRule(
			{
				value: true,
			},
			false,
		),
	).toStrictEqual(false);

	expect(
		mergeRule(
			{
				value: false,
			},
			true,
		),
	).toStrictEqual({
		value: true,
	});

	expect(
		mergeRule(
			{
				option: {
					optional: 'OPTIONAL_VALUE',
				},
			},
			{
				option: {
					optional: 'CHANGED_OPTIONAL_VALUE',
				},
			},
		),
	).toStrictEqual({
		option: {
			optional: 'CHANGED_OPTIONAL_VALUE',
		},
	});
});

it('test', () => {
	expect(
		mergeConfig(
			{
				overrides: {
					a: {
						rules: {
							rule1: true,
						},
					},
				},
			},
			{
				overrides: {
					a: {
						rules: {
							rule1: false,
						},
					},
					b: {
						rules: {
							rule1: true,
						},
					},
				},
			},
		),
	).toStrictEqual({
		overrides: {
			a: {
				rules: {
					rule1: false,
				},
			},
			b: {
				rules: {
					rule1: true,
				},
			},
		},
	});
});
