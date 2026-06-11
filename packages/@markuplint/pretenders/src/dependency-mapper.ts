import type { PretenderDirectorMap } from './pretender-director.js';
import type { Identifier, Identity } from './types.js';
import type { Pretender } from '@markuplint/ml-config';

/**
 * Follows chains where one component wraps another (e.g., MyButton -> Button -> button)
 * until a native element is reached or a cycle is detected.
 *
 * Uses import-path-based resolution when a name index is provided, falling back to
 * name-based lookup for backward compatibility.
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
			...(filePath ? { filePath } : {}),
		};
		if (via.length > 0) {
			Object.assign(pretender, { _via: via });
		}

		linkedPretenders.push(pretender);
	}

	return linkedPretenders.toSorted(propSort('selector'));
}

/**
 * For backward-compatible name-based lookup.
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
 * Comparator that sorts by `propName`, case-insensitive for string values.
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
		return value.toLowerCase() as T;
	}
	return value;
}
