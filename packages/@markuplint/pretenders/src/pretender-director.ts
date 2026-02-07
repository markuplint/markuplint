import type { Identifier, Identity } from './types.js';

import { dependencyMapper } from './dependency-mapper.js';

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
