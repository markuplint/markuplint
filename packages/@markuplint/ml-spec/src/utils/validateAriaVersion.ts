import type { ARIAVersion } from '../types';

import { ariaVersions } from '../constant/aria-version';

export function validateAriaVersion(version: string): version is ARIAVersion {
	return ariaVersions.includes(version as ARIAVersion);
}
