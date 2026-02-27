import type { Identifier, Identity } from './types.js';
import type { Pretender } from '@markuplint/ml-config';

/**
 * Internal map structure storing component identifiers to their identity and source location.
 */
type PretenderDirectorMap = Map<Identifier, [identity: Identity, filePath?: string]>;

/**
 * Collects and manages pretender mappings discovered during source file scanning.
 * Acts as a registry where component-to-element relationships are added during
 * traversal, then resolved into a flat list of pretenders with dependency linking.
 */
export class PretenderDirector {
	#map: PretenderDirectorMap = new Map();

	/**
	 * Registers a component as a pretender mapping. If the identifier is already
	 * registered, the call is silently ignored (first definition wins).
	 *
	 * @param identifier - The component selector (e.g., component name)
	 * @param identity - The native HTML element the component renders as
	 * @param filePath - The relative file path where the component is defined
	 * @param line - The line number of the component declaration
	 * @param col - The column number of the component declaration
	 */
	add(identifier: Identifier, identity: Identity, filePath: string, line: number, col: number) {
		if (this.#map.has(identifier)) {
			return;
		}

		this.#map.set(identifier, [identity, `${filePath}:${line}:${col}`]);
	}

	/**
	 * Resolves all registered mappings into a sorted array of Pretender objects.
	 * Follows component-to-component chains to determine the final native element identity.
	 *
	 * @returns A sorted array of resolved Pretender objects
	 */
	getPretenders() {
		return dependencyMapper(this.#map);
	}
}

/**
 * Resolves a map of component-to-identity mappings into a flat array of Pretender objects.
 * Follows chains where one component wraps another (e.g., MyButton -> Button -> button)
 * until a native element is reached or a recursive loop is detected.
 *
 * @param map - The map of component identifiers to their identity and file path
 * @returns A sorted array of fully resolved Pretender objects
 */
export function dependencyMapper(map: Readonly<PretenderDirectorMap>): Pretender[] {
	const linkedPretenders: Pretender[] = [];

	const collection = [...map.entries()];

	for (const [identifier, [_identity, _filePath]] of collection) {
		let identity = _identity;
		let filePath = _filePath;
		let elName = getElName(identity);
		const via: string[] = [];
		const visited = new Set<string>([identifier]);

		while (true) {
			const mappedPretender = map.get(elName);
			if (!mappedPretender) {
				break;
			}

			identity = mappedPretender[0];
			filePath = mappedPretender[1];

			if (visited.has(elName)) {
				via.push('...[Recursive]');
				break;
			}

			visited.add(elName);
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

function getElName(identity: Identity) {
	if (typeof identity === 'string') {
		return identity;
	}
	return identity.element;
}

function propSort<T, P extends keyof T>(propName: P) {
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
