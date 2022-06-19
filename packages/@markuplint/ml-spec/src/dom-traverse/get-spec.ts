import type { MLMLSpec } from '../types';

import { htmlSpec } from '../specs/html-spec';

export function getSpec(el: Element, schema: MLMLSpec) {
	return htmlSpec(schema, el.localName, el.namespaceURI);
}
