import type { ARIAVersion } from '../types/index.js';

import { ariaVersions } from '../constant/aria-version.js';

export function validateAriaVersion(version: string): version is ARIAVersion {
	return ariaVersions.includes(version as ARIAVersion);
}
