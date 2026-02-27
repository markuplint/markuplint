import type { Identifier, Identity, ImportPath } from './types.js';

import { dependencyMapper } from './dependency-mapper.js';

/**
 * Internal map structure storing component mappings keyed by import path (or identifier as fallback).
 * The value tuple includes the component identifier (name), its identity, and an optional source location.
 */
export type PretenderDirectorMap = Map<string, [identifier: Identifier, identity: Identity, filePath?: string]>;

/**
 * Collects and manages pretender mappings discovered during source file scanning.
 * Acts as a registry where component-to-element relationships are added during
 * traversal, then resolved into a flat list of pretenders with dependency linking.
 *
 * The internal map uses import paths as keys when available, falling back to
 * component identifiers (names) for backward compatibility with name-based scanners.
 */
export class PretenderDirector {
	#map: PretenderDirectorMap = new Map();
	#nameIndex: Map<Identifier, string> = new Map();

	/**
	 * Registers a component as a pretender mapping. If the key (import path or identifier)
	 * is already registered, the call is silently ignored (first definition wins).
	 *
	 * @param identifier - The component selector (e.g., component name)
	 * @param identity - The native HTML element the component renders as
	 * @param filePath - The relative file path where the component is defined
	 * @param line - The line number of the component declaration
	 * @param col - The column number of the component declaration
	 * @param importPath - Optional import path for uniquely identifying the component across files
	 */
	add(
		identifier: Identifier,
		identity: Identity,
		filePath: string,
		line: number,
		col: number,
		importPath?: ImportPath,
	) {
		const key = importPath ?? identifier;

		if (this.#map.has(key)) {
			return;
		}

		this.#map.set(key, [identifier, identity, `${filePath}:${line}:${col}`]);

		if (!this.#nameIndex.has(identifier)) {
			this.#nameIndex.set(identifier, key);
		}
	}

	/**
	 * Resolves all registered mappings into a sorted array of Pretender objects.
	 * Follows component-to-component chains to determine the final native element identity.
	 *
	 * @returns A sorted array of resolved Pretender objects
	 */
	getPretenders() {
		return dependencyMapper(this.#map, this.#nameIndex);
	}
}
