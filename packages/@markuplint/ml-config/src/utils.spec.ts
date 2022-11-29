import { exchangeValueOnRule, provideValue } from './utils';

it('provideValue', () => {
	expect(
		provideValue('The name is {{ dataName }}', {
			$0: 'data-hoge',
			$1: 'hoge',
			dataName: 'hoge',
		}),
	).toBe('The name is hoge');

	expect(provideValue('The name is {{ dataName }}', {})).toBeUndefined();

	expect(
		provideValue('No variable', {
			$0: 'data-hoge',
			$1: 'hoge',
			dataName: 'hoge',
		}),
	).toBe('No variable');
});

it('exchangeValueOnRule', () => {
	expect(
		exchangeValueOnRule('The name is {{ dataName }}', {
			$0: 'data-hoge',
			$1: 'hoge',
			dataName: 'hoge',
		}),
	).toBe('The name is hoge');

	expect(
		exchangeValueOnRule(
			{
				value: 'The name is {{ dataName }}',
			},
			{
				$0: 'data-hoge',
				$1: 'hoge',
				dataName: 'hoge',
			},
		),
	).toStrictEqual({
		value: 'The name is hoge',
	});

	expect(
		exchangeValueOnRule(
			{
				severity: 'error',
				value: 'The name is {{ dataName }}',
				reason: 'For {{ dataName }}',
			},
			{
				$0: 'data-hoge',
				$1: 'hoge',
				dataName: 'hoge',
			},
		),
	).toStrictEqual({
		severity: 'error',
		value: 'The name is hoge',
		reason: 'For hoge',
	});

	expect(
		exchangeValueOnRule(
			{
				value: 'The name is {{ dataName }}',
				option: {
					propA: 'The name is {{ dataName }}',
					propB: ['The name is {{ dataName }}'],
					propC: {
						prop: 'The name is {{ dataName }}',
					},
				},
			},
			{
				dataName: 'hoge',
			},
		),
	).toStrictEqual({
		value: 'The name is hoge',
		option: {
			propA: 'The name is hoge',
			propB: ['The name is hoge'],
			propC: {
				prop: 'The name is hoge',
			},
		},
	});
});
