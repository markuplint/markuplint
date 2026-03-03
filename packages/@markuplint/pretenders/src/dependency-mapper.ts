import type { PretenderDirectorMap } from './pretender-director.js';
import type { Identifier, Identity } from './types.js';
import type { Pretender } from '@markuplint/ml-config';

/**
 * Resolves a map of component-to-identity mappings into a flat array of Pretender objects.
 * Follows chains where one component wraps another (e.g., MyButton -> Button -> button)
 * until a native element is reached or a cycle is detected.
 *
 * Uses import-path-based resolution when a name index is provided, falling back to
 * name-based lookup for backward compatibility.
 *
 * @param map - The map of component keys to their [identifier, identity, filePath] tuples
 * @param nameIndex - Optional mapping from component names to map keys for resolving references
 * @returns A sorted array of fully resolved Pretender objects
 */
export function dependencyMapper(
	map: Readonly<PretenderDirectorMap>,
	nameIndex?: Readonly<Map<Identifier, string>>,
): Pretender[] {
	const resolvedNameIndex = nameIndex ?? buildNameIndex(map);
	const linkedPretenders: Pretender[] = [];

	for (const [key, [identifier, _identity, _filePath]] of map) {
		let identity = _identity;
		let filePath = _filePath;
		let elName = getElName(identity);
		const via: string[] = [];
		const visited = new Set<string>([key]);

		while (true) {
			const lookupKey = resolvedNameIndex.get(elName) ?? elName;
			const mappedPretender = map.get(lookupKey);
			if (!mappedPretender) {
				break;
			}

			identity = mappedPretender[1];
			filePath = mappedPretender[2];

			if (visited.has(lookupKey)) {
				via.push('...[Recursive]');
				break;
			}
			visited.add(lookupKey);
			via.push(elName);
			elName = getElName(identity);
		}

		const pretender: Pretender = {
			selector: identifier,
			as: identity,
		};
		if (filePath) {
			// @ts-ignore initialize readonly property
			pretender.filePath = filePath;
		}
		if (via.length > 0) {
			// @ts-ignore
			pretender._via = via;
		}

		linkedPretenders.push(pretender);
	}

	return linkedPretenders.toSorted(propSort('selector'));
}

/**
 * Builds a name-to-key index from the map for backward-compatible name-based lookup.
 * First definition wins when multiple entries share the same identifier.
 */
function buildNameIndex(map: Readonly<PretenderDirectorMap>): Map<Identifier, string> {
	const index = new Map<Identifier, string>();
	for (const [key, [identifier]] of map) {
		if (!index.has(identifier)) {
			index.set(identifier, key);
		}
	}
	return index;
}

function getElName(identity: Identity) {
	if (typeof identity === 'string') {
		return identity;
	}
	return identity.element;
}

/**
 * Creates a comparator function that sorts objects by a specified property.
 *
 * @template T - The object type
 * @template P - The property key type
 * @param propName - The property to sort by (case-insensitive for strings)
 * @returns A comparator function for use with `Array.prototype.sort()`
 */
export function propSort<T, P extends keyof T>(propName: P) {
	return (a: T, b: T) => {
		const nameA = toLowerCase(a[propName]);
		const nameB = toLowerCase(b[propName]);
		if (nameA < nameB) {
			return -1;
		}
		if (nameA > nameB) {
			return 1;
		}

		return 0;
	};
}

function toLowerCase<T>(value: T): T {
	if (typeof value === 'string') {
		// @ts-ignore
		return value.toLowerCase();
	}
	return value;
}
