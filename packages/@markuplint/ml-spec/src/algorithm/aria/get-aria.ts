import type { ARIA, PermittedRoles } from '../../types/aria.js';
import type { ARIAVersion, Matches, MLMLSpec } from '../../types/index.js';
import type { ReadonlyDeep } from 'type-fest';

import { getSpecByTagName } from '../../utils/get-spec-by-tag-name.js';
import { resolveVersion } from '../../utils/resolve-version.js';

/**
 * The resolved ARIA of an element depends on the element specs it is read from, which differ between the base
 * spec and a spec merged with an `ExtendedSpec` that overrides an element, so each `specs` array is cached on its
 * own. How long an array lives, and so how warm the cache stays, is described at `schemaToSpec`.
 */
const caches = new WeakMap<object, Map<string, Omit<ReadonlyDeep<ARIA>, ARIAVersion> | null>>();

/**
 * Retrieves the resolved ARIA specification for an element, taking into account
 * ARIA version differences and conditional overrides based on the element's
 * current attribute state (e.g., `input[type=checkbox]` vs `input[type=text]`).
 *
 * @param specs - The full markup language specification
 * @param localName - The local tag name of the element
 * @param namespace - The namespace URI of the element, or null
 * @param version - The ARIA specification version to use
 * @param matches - A function that tests whether the element matches a CSS selector
 * @returns The resolved ARIA specification for the element, or null if no spec exists
 */
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
		return {
			...aria,
			permittedRoles: optimizePermittedRoles(aria.permittedRoles, version),
		};
	}
	const conditionKeys = Object.keys(conditions);
	let { implicitRole, permittedRoles, implicitProperties, properties, namingProhibited } = aria;
	for (const cond of conditionKeys) {
		let matched: boolean;
		try {
			matched = matches(cond);
		} catch (error: unknown) {
			// Native Element.prototype.matches() cannot evaluate :aria()
			// pseudo-class. When called from getImplicitRoleName() or
			// getPermittedRoles() via accname-computation, native matches
			// is used, which throws a DOMException (name: "SyntaxError").
			// Note: JSDOM's DOMException is context-local, so instanceof
			// checks against the global DOMException/SyntaxError fail.
			if (error instanceof Error && error.name === 'SyntaxError') {
				continue;
			}
			throw error;
		}
		if (!matched) {
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
		permittedRoles: optimizePermittedRoles(permittedRoles, version),
		implicitProperties,
		properties,
		namingProhibited,
	};
}

/**
 * Returns raw ARIA spec without permittedRoles optimization.
 * Callers must apply optimizePermittedRoles() to the result.
 */
function getVersionResolvedARIA(specs: MLMLSpec, localName: string, namespace: string | null, version: ARIAVersion) {
	let cache = caches.get(specs.specs);
	if (!cache) {
		cache = new Map();
		caches.set(specs.specs, cache);
	}
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
	cache.set(key, aria);
	return aria;
}

function optimizePermittedRoles(permittedRoles: ReadonlyDeep<PermittedRoles>, version: ARIAVersion) {
	if (!Array.isArray(permittedRoles)) {
		return permittedRoles;
	}
	const unique = new Set(permittedRoles);

	// https://w3c.github.io/aria/#none
	if (unique.has('presentation')) {
		unique.add('none');
	}
	if (unique.has('none')) {
		unique.add('presentation');
	}

	// https://w3c.github.io/aria/#image
	// In ARIA 1.3, `image` is the primary role name and `img` is a synonym.
	if (version === '1.3') {
		if (unique.has('image')) {
			unique.add('img');
		}
		if (unique.has('img')) {
			unique.add('image');
		}
	}

	return [...unique].toSorted();
}
