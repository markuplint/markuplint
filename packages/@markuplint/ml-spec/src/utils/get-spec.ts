import type { ElementSpec } from '../types/index.js';

import { getSpecByTagName } from './get-spec-by-tag-name.js';

export function getSpec<K extends keyof ElementSpec>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: readonly Pick<ElementSpec, 'name' | K>[],
) {
	return getSpecByTagName(specs, el.localName, el.namespaceURI);
}
