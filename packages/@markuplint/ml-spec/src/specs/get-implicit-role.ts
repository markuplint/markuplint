import type { ARIAVersion, Matches, MLMLSpec } from '../types';
import type { ReadonlyDeep } from 'type-fest';

import { getARIA } from './get-aria';

export function getImplicitRole(
	specs: ReadonlyDeep<MLMLSpec>,
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
