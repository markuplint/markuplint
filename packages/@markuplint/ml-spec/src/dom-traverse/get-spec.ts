import type { MLMLSpec } from '../types';

import { getSpecByTagName } from '../specs/get-spec-by-tag-name';

export function getSpec(el: Element, schema: MLMLSpec) {
	return getSpecByTagName(schema, el.localName, el.namespaceURI);
}
