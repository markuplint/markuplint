import { mergeConfig } from './merge-config';

it('test', () => {
	expect(mergeConfig({}, {})).toStrictEqual({});
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
		mergeConfig(
			{
				specs: '@markuplint/vue-spec',
			},
			{
				specs: { '/\\.[jt]sx?$/i': '@markuplint/react-spec' },
			},
		),
	).toStrictEqual({
		specs: {
			'/.+/': '@markuplint/vue-spec',
			'/\\.[jt]sx?$/i': '@markuplint/react-spec',
		},
	});
});

it('test', () => {
	expect(
		mergeConfig(
			{
				importRules: ['a', 'b', 'c'],
			},
			{
				importRules: ['c', 'b', 'd'],
			},
		),
	).toStrictEqual({
		importRules: ['a', 'b', 'c', 'd'],
	});
});

it('test', () => {
	expect(
		mergeConfig(
			{
				rules: {
					sameRule: {
						option: {
							optional: 'OPTIONAL_VALUE',
						},
					},
				},
			},
			{
				rules: {
					sameRule: {
						option: {
							optional: 'CHANGED_OPTIONAL_VALUE',
						},
					},
				},
			},
		),
	).toStrictEqual({
		rules: {
			sameRule: {
				option: {
					optional: 'CHANGED_OPTIONAL_VALUE',
				},
			},
		},
	});
});
