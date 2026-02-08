import type { ElementSpec } from '../types/index.js';

import { getSpecByTagName } from './get-spec-by-tag-name.js';

/**
 * Retrieves the element specification for a DOM element by looking up its local name
 * and namespace URI in the provided specs array. This is a convenience wrapper around
 * `getSpecByTagName` that accepts a DOM element directly.
 *
 * @template K - The keys of `ElementSpec` to include in the returned spec object
 * @param el - The DOM element to look up
 * @param specs - The array of element specifications to search
 * @returns The matching element specification, or null if not found
 */
export function getSpec<K extends keyof ElementSpec>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: readonly Pick<ElementSpec, 'name' | K>[],
) {
	return getSpecByTagName(specs, el.localName, el.namespaceURI);
}
