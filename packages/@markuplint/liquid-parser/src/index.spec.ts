import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('Tags', () => {
	test('liquid-block', () => {
		expect(parse('{% any %}').nodeList[0]?.nodeName).toBe('#ps:liquid-block');
	});

	test('liquid-output', () => {
		expect(parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:liquid-output');
	});
});
