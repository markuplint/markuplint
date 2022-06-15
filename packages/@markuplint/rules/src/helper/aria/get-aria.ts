import type { Element } from '@markuplint/ml-core';
import type { ARIA, ARIAVersion, MLMLSpec } from '@markuplint/ml-spec';

import { htmlSpec } from '../spec/html-spec';

import { resolveVersion } from './resolve-version';

const cache = new Map<string, Omit<ARIA, ARIAVersion> | null>();

export function getARIA(
	specs: Readonly<MLMLSpec>,
	el: Element<any, any>,
	version: ARIAVersion,
): Omit<ARIA, ARIAVersion | 'conditions'> | null {
	const aria = getVersionResolvedARIA(specs, el, version);
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
		if (!el.matches(cond)) {
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

function getVersionResolvedARIA(specs: Readonly<MLMLSpec>, el: Element<any, any>, version: ARIAVersion) {
	let aria = cache.get(el.nameWithNS + version);
	if (aria !== undefined) {
		return aria;
	}
	const spec = htmlSpec(specs, el.nameWithNS)?.aria;
	if (!spec) {
		cache.set(el.nameWithNS + version, null);
		return null;
	}
	aria = resolveVersion(spec, version);
	cache.set(el.nameWithNS + version, aria);
	return aria;
}
