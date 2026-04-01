import { describe, test, expect } from 'vitest';

import { RuleFixer } from './rule-fixer.js';

describe('RuleFixer', () => {
	const fixer = new RuleFixer();

	test('replaceText', () => {
		const token = { startOffset: 5, raw: 'hello' };
		const edit = fixer.replaceText(token, 'world');
		expect(edit).toStrictEqual({ range: [5, 10], text: 'world' });
	});

	test('replaceRange', () => {
		const edit = fixer.replaceRange([3, 7], 'abcd');
		expect(edit).toStrictEqual({ range: [3, 7], text: 'abcd' });
	});

	test('insertBefore', () => {
		const token = { startOffset: 10, raw: 'hello' };
		// eslint-disable-next-line unicorn/prefer-modern-dom-apis -- Not a DOM API; this is RuleFixer.insertBefore
		const edit = fixer.insertBefore(token, 'prefix');
		expect(edit).toStrictEqual({ range: [10, 10], text: 'prefix' });
	});

	test('insertAfter', () => {
		const token = { startOffset: 10, raw: 'hello' };
		const edit = fixer.insertAfter(token, 'suffix');
		expect(edit).toStrictEqual({ range: [15, 15], text: 'suffix' });
	});

	test('remove', () => {
		const token = { startOffset: 2, raw: 'abc' };
		const edit = fixer.remove(token);
		expect(edit).toStrictEqual({ range: [2, 5], text: '' });
	});

	test('removeRange', () => {
		const edit = fixer.removeRange([0, 3]);
		expect(edit).toStrictEqual({ range: [0, 3], text: '' });
	});
});
