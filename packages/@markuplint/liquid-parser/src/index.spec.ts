import { describe, test, expect } from 'vitest';

import { parse } from './parse.js';

describe('Tags', () => {
	test('liquid-block', () => {
		expect(parse('{% any %}').nodeList[0]?.nodeName).toBe('#ps:liquid-block');
	});

	test('liquid-output', () => {
		expect(parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:liquid-output');
	});
});
