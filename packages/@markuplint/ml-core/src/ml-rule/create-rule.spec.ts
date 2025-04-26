import { describe, test, expect } from 'vitest';

import { createRule } from '../ml-rule/create-test-rule.js';
import { createTestDocument } from '../test/index.js';

describe('createRule', () => {
	test('defaultValue', () => {
		const document = createTestDocument('<div></div>');

		const rule = createRule({
			name: 'test-rule',
			defaultValue: [1, 2, 3],
			verify({ document }) {
				expect(document.rule.value).toStrictEqual([1, 2, 3]);

				for (const el of document.getElementsByTagName('div')) {
					expect(el.rule.value).toStrictEqual([1, 2, 3]);
				}

				return;
			},
		});

		void rule.verify(document, { locale: 'en' }, false);
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
			verify({ document }) {
				expect(document.rule.value).toStrictEqual([4, 5, 6]);

				for (const el of document.getElementsByTagName('div')) {
					expect(el.rule.value).toStrictEqual([4, 5, 6]);
				}

				return;
			},
		});

		void rule.verify(document, { locale: 'en' }, false);
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
			verify({ document }) {
				expect(document.rule.value).toStrictEqual([1, 2, 3]);

				for (const el of document.getElementsByTagName('div')) {
					expect(el.rule.value).toStrictEqual([1, 2, 3]);
				}

				return;
			},
		});

		void rule.verify(document, { locale: 'en' }, false);
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
			verify({ document }) {
				expect(document.rule.value).toStrictEqual([]);

				for (const el of document.getElementsByTagName('div')) {
					expect(el.rule.value).toStrictEqual([]);
				}

				return;
			},
		});

		void rule.verify(document, { locale: 'en' }, false);
	});
});
