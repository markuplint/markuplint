import type { ARIAVersion, Matches, MLMLSpec } from '../types';
import type { ARIA } from '../types/aria';

import { getSpecByTagName } from './get-spec-by-tag-name';
import { resolveVersion } from './resolve-version';

const cache = new Map<string, Omit<ARIA, ARIAVersion> | null>();

export function getARIA(
	specs: Readonly<MLMLSpec>,
	localName: string,
	namespace: string | null,
	version: ARIAVersion,
	matches: Matches,
): Omit<ARIA, ARIAVersion | 'conditions'> | null {
	const aria = getVersionResolvedARIA(specs, localName, namespace, version);
	if (!aria) {
		return null;
	}
	const conditions = aria.conditions;
	if (!conditions) {
		return aria;
	}
	const conds = Object.keys(conditions);
	let { implicitRole, permittedRoles, implicitProperties, properties, namingProhibited } = aria;
	for (const cond of conds) {
		if (!matches(cond)) {
			continue;
		}
		const condARIA = conditions[cond];
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

function getVersionResolvedARIA(
	specs: Readonly<MLMLSpec>,
	localName: string,
	namespace: string | null,
	version: ARIAVersion,
) {
	const key = localName + namespace + version;
	let aria = cache.get(key);
	if (aria !== undefined) {
		return aria;
	}
	const spec = getSpecByTagName(specs, localName, namespace)?.aria;
	if (!spec) {
		cache.set(key, null);
		return null;
	}
	aria = resolveVersion(spec, version);
	cache.set(key, aria);
	return aria;
}
