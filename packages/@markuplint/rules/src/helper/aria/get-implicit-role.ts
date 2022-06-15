import type { Element } from '@markuplint/ml-core';
import type { ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { getARIA } from './get-aria';

export function getImplicitRole(specs: Readonly<MLMLSpec>, el: Element<any, any>, version: ARIAVersion) {
	const aria = getARIA(specs, el, version);
	if (!aria) {
		return false;
	}
	return aria.implicitRole;
}
