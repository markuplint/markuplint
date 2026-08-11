import type { ImportBinding } from './import-resolver/types.js';
import type { Identifier, Identity, ImportPath } from './types.js';

import { dependencyMapper } from './dependency-mapper.js';

export type PretenderDirectorMap = Map<
	string,
	[identifier: Identifier, identity: Identity, filePath?: string, sourceFile?: string]
>;

/**
 * The internal map keys on import paths when available, falling back to
 * component identifiers (names) for backward compatibility with name-based scanners.
 */
export class PretenderDirector {
	#map: PretenderDirectorMap = new Map();
	#nameIndex: Map<Identifier, string> = new Map();
	#importsByFile: Map<string, readonly ImportBinding[]> = new Map();

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

		this.#map.set(key, [identifier, identity, `${filePath}:${line}:${col}`, filePath]);

		if (!this.#nameIndex.has(identifier)) {
			this.#nameIndex.set(identifier, key);
		}
	}

	/**
	 * Registers the import bindings found in `filePath`, so that
	 * {@link dependencyMapper} can resolve a JSX/template reference to the
	 * file it was actually imported from instead of guessing by name alone.
	 */
	addImports(filePath: string, bindings: readonly ImportBinding[]) {
		this.#importsByFile.set(filePath, bindings);
	}

	/**
	 * @param cwd - Base directory that the recorded `sourceFile` paths (and any
	 *   module resolution triggered while chasing an import) are relative to.
	 *   Must match the `cwd` the scanner itself used to build those paths.
	 * @param sources - The same in-memory content overrides (keyed by normalized
	 *   absolute path) passed to the scanner, so cross-file import resolution
	 *   reads a file's current (possibly unsaved) content instead of always
	 *   falling back to disk.
	 */
	getPretenders(cwd?: string, sources?: ReadonlyMap<string, string>) {
		return dependencyMapper(this.#map, this.#nameIndex, { importsByFile: this.#importsByFile, cwd, sources });
	}
}
