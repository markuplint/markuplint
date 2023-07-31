import { describe, test, expect } from 'vitest';

import { parse } from './parse.js';

describe('Tags', () => {
	test('nunjucks-block', () => {
		expect(parse('{% any %}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-block');
	});

	test('nunjucks-output', () => {
		expect(parse('{{ any }}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-output');
	});

	test('nunjucks-comment', () => {
		expect(parse('{# any #}').nodeList[0]?.nodeName).toBe('#ps:nunjucks-comment');
	});
});
