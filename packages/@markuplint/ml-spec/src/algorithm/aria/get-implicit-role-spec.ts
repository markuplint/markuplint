import type { ARIAVersion, Matches, MLMLSpec } from '../../types/index.js';

import { getARIA } from './get-aria.js';

export function getImplicitRole(
	specs: MLMLSpec,
	localName: string,
	namespace: string | null,
	version: ARIAVersion,
	matches: Matches,
) {
	const aria = getARIA(specs, localName, namespace, version, matches);
	if (!aria) {
		return false;
	}
	return aria.implicitRole;
}
