import type { MLElement } from '../ml-dom/node/element.js';

import type { CreateTestOptions } from '../test/index.js';

import { createTestDocument } from '../test/index.js';

/**
 * Parses markup and returns an element of MLDOM, for the specs of the algorithms of
 * `@markuplint/ml-spec` and `@markuplint/selector`, which read MLDOM only.
 *
 * @param html - The markup to parse
 * @param selector - Picks an element of the parsed document. Without it, the first node that is an element
 * @param options - Options for the parser, the config, the specs and the pretenders
 * @returns The element
 * @throws {Error} When no element is found
 */
export function elementOf(html: string, selector?: string, options?: CreateTestOptions): MLElement<any, any> {
	const document = createTestDocument(html, options);
	if (selector) {
		const found = document.querySelector(selector);
		if (!found) {
			throw new Error(`An element is not found: ${selector}`);
		}
		return found;
	}
	const first = document.nodeList.find(node => node.is(node.ELEMENT_NODE));
	if (!first?.is(first.ELEMENT_NODE)) {
		throw new Error('An element is not created');
	}
	return first;
}
