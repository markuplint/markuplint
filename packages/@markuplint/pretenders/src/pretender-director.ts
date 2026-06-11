import type { Identifier, Identity, ImportPath } from './types.js';

import { dependencyMapper } from './dependency-mapper.js';

export type PretenderDirectorMap = Map<string, [identifier: Identifier, identity: Identity, filePath?: string]>;

/**
 * The internal map keys on import paths when available, falling back to
 * component identifiers (names) for backward compatibility with name-based scanners.
 */
export class PretenderDirector {
	#map: PretenderDirectorMap = new Map();
	#nameIndex: Map<Identifier, string> = new Map();

	/**
	 * When the key (import path or identifier) is already registered, the call
	 * is silently ignored (first definition wins).
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

	getPretenders() {
		return dependencyMapper(this.#map, this.#nameIndex);
	}
}
