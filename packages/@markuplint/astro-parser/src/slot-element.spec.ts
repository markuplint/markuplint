import { test, expect } from 'vitest';

import { parser } from './parser.js';

test('the slot element is the placeholder of the framework, not the HTML slot element of a shadow tree', () => {
	expect(parser.slotElement).toBe('framework');
});
