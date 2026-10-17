import type { ImportBinding } from './import-resolver/types.js';
import type { Identifier, Identity, ImportPath, PretenderScanEntry } from './types.js';

import { dependencyMapper } from './dependency-mapper.js';

export type PretenderDirectorMap = Map<
	string,
	[identifier: Identifier, identity: Identity, filePath?: string, sourceFile?: string, localName?: string]
>;

/**
 * The internal map keys on import paths when available, falling back to
 * component identifiers (names) for backward compatibility with name-based scanners.
 */
export class PretenderDirector {
	#map: PretenderDirectorMap = new Map();
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
		localName?: string,
	) {
		const key = importPath ?? identifier;

		if (this.#map.has(key)) {
			return;
		}

		this.#map.set(key, [identifier, identity, `${filePath}:${line}:${col}`, filePath, localName]);
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
	 * @param dependencies - A sink for the files read while chasing imports
	 *   (see `PretenderScanOptions#dependencies`)
	 * @param entry - The file being linted, whose names for its imports are added
	 *   as pretenders (see {@link PretenderScanEntry})
	 */
	getPretenders(
		cwd?: string,
		sources?: ReadonlyMap<string, string>,
		dependencies?: Set<string>,
		entry?: PretenderScanEntry,
	) {
		return dependencyMapper(this.#map, undefined, {
			importsByFile: this.#importsByFile,
			cwd,
			sources,
			dependencies,
			entry,
		});
	}
}
