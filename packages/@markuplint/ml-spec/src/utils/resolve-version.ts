import type { ARIA } from '../types/aria.js';
import type { ARIAVersion } from '../types/index.js';
import type { ReadonlyDeep } from 'type-fest';

/**
 * Resolves an element's ARIA specification by merging version-specific overrides
 * on top of the base properties. For each ARIA property (implicitRole, permittedRoles,
 * etc.), the version-specific value takes precedence over the base value.
 * `namingProhibited` is special-cased: ARIA 1.1 always uses the base value since
 * `namingProhibited` was introduced in ARIA 1.2.
 *
 * @param aria - The element's full ARIA specification including version-specific blocks
 * @param version - The ARIA specification version to resolve for
 * @returns The resolved ARIA specification with version-specific overrides applied
 */
export function resolveVersion(aria: ReadonlyDeep<ARIA>, version: ARIAVersion): Omit<ReadonlyDeep<ARIA>, ARIAVersion> {
	const implicitRole = aria[version]?.implicitRole ?? aria.implicitRole;
	const permittedRoles = aria[version]?.permittedRoles ?? aria.permittedRoles;
	const implicitProperties = aria[version]?.implicitProperties ?? aria.implicitProperties;
	const properties = aria[version]?.properties ?? aria.properties;
	const namingProhibited =
		version === '1.1' ? aria.namingProhibited : (aria[version]?.namingProhibited ?? aria.namingProhibited);
	const conditions = aria[version]?.conditions ?? aria.conditions;
	return {
		implicitRole,
		permittedRoles,
		implicitProperties,
		properties,
		namingProhibited,
		conditions,
	};
}
