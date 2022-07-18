import type { ElementSpec } from '../types';

import { getSpecByTagName } from '../specs/get-spec-by-tag-name';

export function getSpec<K extends keyof ElementSpec>(el: Element, specs: Pick<ElementSpec, 'name' | K>[]) {
	return getSpecByTagName(specs, el.localName, el.namespaceURI);
}
