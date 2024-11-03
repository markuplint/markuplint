import type { ARIA, PermittedRoles } from '../types/aria.js';
import type { ARIAVersion, Matches, MLMLSpec } from '../types/index.js';
import type { ReadonlyDeep } from 'type-fest';

import { getSpecByTagName } from './get-spec-by-tag-name.js';
import { resolveVersion } from './resolve-version.js';

const cache = new Map<string, Omit<ReadonlyDeep<ARIA>, ARIAVersion> | null>();

export function getARIA(
	specs: MLMLSpec,
	localName: string,
	namespace: string | null,
	version: ARIAVersion,
	matches: Matches,
): Omit<ReadonlyDeep<ARIA>, ARIAVersion | 'conditions'> | null {
	const aria = getVersionResolvedARIA(specs, localName, namespace, version);
	if (!aria) {
		return null;
	}
	const conditions = aria.conditions;
	if (!conditions) {
		return aria;
	}
	const conditionKeys = Object.keys(conditions);
	let { implicitRole, permittedRoles, implicitProperties, properties, namingProhibited } = aria;
	for (const cond of conditionKeys) {
		if (!matches(cond)) {
			continue;
		}
		const condARIA = conditions[cond];
		if (!condARIA) {
			continue;
		}
		implicitRole = condARIA.implicitRole ?? implicitRole;
		permittedRoles = condARIA.permittedRoles ?? permittedRoles;
		implicitProperties = condARIA.implicitProperties ?? implicitProperties;
		properties = condARIA.properties ?? properties;
		namingProhibited = condARIA.namingProhibited ?? namingProhibited;
	}
	return {
		implicitRole,
		permittedRoles,
		implicitProperties,
		properties,
		namingProhibited,
	};
}

function getVersionResolvedARIA(specs: MLMLSpec, localName: string, namespace: string | null, version: ARIAVersion) {
	const key = localName + namespace + version;
	let aria = cache.get(key);
	if (aria !== undefined) {
		return aria;
	}
	const spec = getSpecByTagName(specs.specs, localName, namespace)?.aria;
	if (!spec) {
		cache.set(key, null);
		return null;
	}
	aria = resolveVersion(spec, version);
	if (aria.permittedRoles !== false) {
		aria = {
			...aria,
			permittedRoles: optimizePermittedRoles(aria.permittedRoles),
		};
	}
	cache.set(key, aria);
	return aria;
}

function optimizePermittedRoles(permittedRoles: ReadonlyDeep<PermittedRoles>) {
	if (!Array.isArray(permittedRoles)) {
		return permittedRoles;
	}
	const unique = new Set(permittedRoles);

	// https://www.w3.org/TR/wai-aria-1.2/#note-regarding-the-aria-1-1-none-role
	if (unique.has('presentation')) {
		unique.add('none');
	}
	if (unique.has('none')) {
		unique.add('presentation');
	}

	return [...unique].toSorted();
}
