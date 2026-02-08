import type { MLMLSpec } from '../types/index.js';
import type { NamespaceURI } from '@markuplint/ml-ast';

import { getAttrSpecs as _getAttrSpecs } from './get-attr-specs-spec.js';

/**
 * Retrieves the attribute specifications for a DOM element by resolving its
 * local name and namespace URI from the provided schema. This is a convenience
 * wrapper around the spec-based `getAttrSpecs` that accepts a DOM element directly.
 *
 * @param el - The DOM element whose attribute specifications to retrieve
 * @param schema - The full markup language specification containing attribute definitions
 * @returns The array of attribute specifications for the element, or null if no spec exists
 */
export function getAttrSpecs(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	schema: MLMLSpec,
) {
	return _getAttrSpecs(el.localName, el.namespaceURI as NamespaceURI, schema);
}
