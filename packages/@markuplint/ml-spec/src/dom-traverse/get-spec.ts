import type { ElementSpec } from '../types';
import type { ReadonlyDeep } from 'type-fest';

import { getSpecByTagName } from '../specs/get-spec-by-tag-name';

export function getSpec<K extends keyof ElementSpec>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	specs: readonly Pick<ReadonlyDeep<ElementSpec>, 'name' | K>[],
) {
	return getSpecByTagName(specs, el.localName, el.namespaceURI);
}
