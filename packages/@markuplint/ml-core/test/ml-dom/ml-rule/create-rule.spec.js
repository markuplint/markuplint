const { createRule } = require('../../../lib/ml-rule/create-test-rule');
const { createTestDocument } = require('../../../lib/test');

describe('createRule', () => {
	test('defaultValue', () => {
		const document = createTestDocument('<div></div>');

		const rule = createRule({
			name: 'test-rule',
			defaultValue: [1, 2, 3],
			async verify({ document }) {
				expect(document.rule.value).toStrictEqual([1, 2, 3]);

				document.getElementsByTagName('div').forEach(el => {
					expect(el.rule.value).toStrictEqual([1, 2, 3]);
				});

				return;
			},
		});

		rule.verify(document, { locale: 'en' });
	});

	test('Change value from config', () => {
		const document = createTestDocument('<div></div>', {
			config: {
				rules: {
					'test-rule': {
						value: [4, 5, 6],
					},
				},
			},
		});

		const rule = createRule({
			name: 'test-rule',
			defaultValue: [1, 2, 3],
			async verify({ document }) {
				expect(document.rule.value).toStrictEqual([4, 5, 6]);

				document.getElementsByTagName('div').forEach(el => {
					expect(el.rule.value).toStrictEqual([4, 5, 6]);
				});

				return;
			},
		});

		rule.verify(document, { locale: 'en' });
	});

	test('Change value to true from config', () => {
		const document = createTestDocument('<div></div>', {
			config: {
				rules: {
					'test-rule': {
						value: true,
					},
				},
			},
		});

		const rule = createRule({
			name: 'test-rule',
			defaultValue: [1, 2, 3],
			async verify({ document }) {
				expect(document.rule.value).toStrictEqual([1, 2, 3]);

				document.getElementsByTagName('div').forEach(el => {
					expect(el.rule.value).toStrictEqual([1, 2, 3]);
				});

				return;
			},
		});

		rule.verify(document, { locale: 'en' });
	});

	test('Change severity', () => {
		const document = createTestDocument('<div></div>', {
			config: {
				rules: {
					'test-rule': {
						severity: 'warning',
					},
				},
			},
		});

		const rule = createRule({
			name: 'test-rule',
			defaultValue: [],
			async verify({ document }) {
				expect(document.rule.value).toStrictEqual([]);

				document.getElementsByTagName('div').forEach(el => {
					expect(el.rule.value).toStrictEqual([]);
				});

				return;
			},
		});

		rule.verify(document, { locale: 'en' });
	});
});
