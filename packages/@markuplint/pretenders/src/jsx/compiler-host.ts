/**
 * @module jsx/compiler-host
 *
 * A caching `ts.CompilerHost` for the JSX scanner. `ts.createCompilerHost(options, true)`
 * sets parent pointers during parsing, so callers no longer need a
 * `program.getTypeChecker()` call purely to trigger the binder. Parsed `SourceFile`s are
 * cached by normalized absolute path AND keyed against the file's current text, so a
 * changed file is reparsed automatically — this matters because file content has no
 * reliable mtime to key on for in-memory/unsaved content (e.g. an editor's dirty
 * buffer), and staleness would otherwise persist until an explicit cache-clear call.
 */

import type ts from 'typescript';

import tsModule from 'typescript';

import { normalizePath } from '../import-resolver/resolve-module-file.js';

const sourceFileCache = new Map<string, { text: string; sourceFile: ts.SourceFile }>();

/**
 * Clears the module-level parsed-`SourceFile` cache. Content-based invalidation
 * already reparses any file whose text changed, so this exists only for callers
 * that want to fully release memory between long-running scan batches.
 */
export function clearSourceFileCache() {
	sourceFileCache.clear();
}

/**
 * Creates a `ts.CompilerHost` that caches parsed `SourceFile`s by content —
 * reparsing only when a file's text differs from the last parse — and enables
 * parent-pointer generation during parsing.
 *
 * @param options - Compiler options passed through to `ts.createCompilerHost`
 * @param sources - Optional in-memory content overrides, keyed by normalized
 *                  absolute path, consulted before falling back to a disk read
 * @returns A `ts.CompilerHost` suitable for `ts.createProgram`
 */
export function createCachingCompilerHost(
	options: ts.CompilerOptions,
	sources?: ReadonlyMap<string, string>,
): ts.CompilerHost {
	const host = tsModule.createCompilerHost(options, /* setParentNodes */ true);
	const baseReadFile = host.readFile.bind(host);

	host.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreateNewSourceFile) => {
		const key = normalizePath(fileName);
		const text = sources?.get(key) ?? baseReadFile(fileName);
		if (text === undefined) {
			onError?.(`File not found: ${fileName}`);
			return;
		}

		const cached = sourceFileCache.get(key);
		if (!shouldCreateNewSourceFile && cached && cached.text === text) {
			return cached.sourceFile;
		}

		const sourceFile = tsModule.createSourceFile(
			fileName,
			text,
			languageVersionOrOptions,
			/* setParentNodes */ true,
		);
		sourceFileCache.set(key, { text, sourceFile });
		return sourceFile;
	};

	if (sources) {
		host.readFile = fileName => sources.get(normalizePath(fileName)) ?? baseReadFile(fileName);
	}

	return host;
}
