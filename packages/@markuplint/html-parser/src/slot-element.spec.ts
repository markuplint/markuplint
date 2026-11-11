import { test, expect } from 'vitest';

import { parser } from './parser.js';

test('the slot element is the HTML slot element unless a parser says that it is the placeholder of a framework', () => {
	expect(parser.slotElement).toBe('html');
});
