import type { MLMLSpec } from '../types';
import type { NamespaceURI } from '@markuplint/ml-ast';

import { getAttrSpecs as _getAttrSpecs } from '../specs/get-attr-specs';

export function getAttrSpecs(el: Element, schema: MLMLSpec) {
	return _getAttrSpecs(el.localName, el.namespaceURI as NamespaceURI, schema);
}
