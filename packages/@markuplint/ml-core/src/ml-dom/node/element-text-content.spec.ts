import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * > For other node types, textContent returns the concatenation of the textContent of every child node, excluding comments and processing instructions.
 *
 * @see https://dom.spec.whatwg.org/#dom-node-textcontent
 */
describe('Element#textContent', () => {
	test('does not include a comment', () => {
		const div = createTestDocument('<div>a<!-- c -->b</div>').querySelector('div');
		expect(div?.textContent).toBe('ab');
	});

	test('does not include a comment of a descendant', () => {
		const div = createTestDocument('<div>a<b>c<!-- d -->e</b><!-- f -->g</div>').querySelector('div');
		expect(div?.textContent).toBe('aceg');
	});

	test('is empty for an element that has only a comment', () => {
		const button = createTestDocument('<button aria-label="Close"><!-- Close --></button>').querySelector('button');
		expect(button?.textContent).toBe('');
	});
});
