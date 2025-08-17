import type { ARIA } from '../types/aria.js';
import type { ARIAVersion } from '../types/index.js';
import type { ReadonlyDeep } from 'type-fest';

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
