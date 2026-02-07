import type { ARIAVersion } from '../types/index.js';

import { ariaVersions } from './aria-version.js';

/**
 * Validates whether a string is a supported ARIA specification version.
 * Acts as a type guard, narrowing the input to the `ARIAVersion` type when `true`.
 *
 * @param version - The version string to validate
 * @returns `true` if the version is a supported ARIA version (e.g., '1.1', '1.2', '1.3')
 */
export function validateAriaVersion(version: string): version is ARIAVersion {
	return ariaVersions.includes(version as ARIAVersion);
}
