/**
 * @module jsx/scan-source-files
 *
 * The source files the JSX scanner walks. A program is created for the files to scan and the
 * files they import (`noResolve` stops that), and its source files are read from it. Each scan
 * creates a new program, which reads every file as it is at that moment, so a changed file (an
 * editor's dirty buffer included, passed as in-memory content) is always seen: there is no cache
 * of ours that could go stale, and none is relied on to be kept by the compiler. The compiler's
 * parsed source files can be dropped with {@link clearSourceFileCache}.
 */

import type { SourceFile } from 'typescript/ast';
import type { RawCompilerOptions } from 'typescript/proto';

import { callTsApi, clearTsSourceFileCache, withVirtualSources } from '../ts-api.js';

/**
 * Drops the parsed source files that the compiler keeps between scans, to release their memory
 * between long-running scan batches. A scan reads every file anew whether or not this was called.
 */
export function clearSourceFileCache() {
	clearTsSourceFileCache();
}

/**
 * The source files of a program of `files`: those files, and the files they import unless
 * `noResolve` is set. Files under `lib` are not loaded.
 *
 * @param files - Absolute paths of the files to scan
 * @param compilerOptions - Compiler options of the program
 * @param sources - Optional in-memory content overrides, keyed by normalized absolute path,
 *                  read in place of the files on disk
 * @returns The parsed source files, readable after this returns
 */
export function readScanSourceFiles(
	files: readonly string[],
	compilerOptions: RawCompilerOptions,
	sources?: ReadonlyMap<string, string>,
): SourceFile[] {
	return withVirtualSources(sources, () =>
		callTsApi(api => {
			const program = api.createProgram(files, compilerOptions);
			try {
				return program.getSourceFileNames().flatMap(fileName => {
					const sourceFile = program.getSourceFile(fileName);
					return sourceFile ? [sourceFile] : [];
				});
			} finally {
				program[Symbol.dispose]();
			}
		}),
	);
}
