/**
 * @module ts-api
 *
 * The one place that talks to the TypeScript compiler API, which runs the compiler as a child process
 * (a platform package, `@typescript/typescript-<platform>`, that the `typescript` package depends on
 * optionally) and talks to it over a pipe. Every other module reads and walks the syntax trees this one
 * returns, through `typescript/ast`, and never starts the compiler itself.
 *
 * - One {@link API} is started on first use and reused until {@link closeTsApi}, which
 *   `clearPretenderCaches()` calls: starting the process is the cost of the first call, not of each.
 *   The library unrefs the child, so a host that never closes it still exits.
 * - A syntax tree is decoded on this side when it is returned, so it stays readable after the remote
 *   lease it came with is released, and no caller has to release anything.
 * - Content that has no file yet (an editor's unsaved buffer) reaches the compiler through the file
 *   system callbacks of the API, which read {@link withVirtualSources} before the disk. The callbacks
 *   know files, not directories: a source in a directory that does not exist on disk is read by path,
 *   but directory-based module resolution does not see it.
 * - A failure to start or talk to the child (no platform package for this machine, a crashed process)
 *   is a {@link TsApiError}: the parsers do not throw on any input, so such an error is never about
 *   the source being read, and callers must not take it for one.
 *
 * `typescript/sync`, `typescript/ast`, `typescript/fs` and `typescript/proto` are the public entry
 * points of the package; the API they expose is documented in the `typescript` package's README and
 * in https://github.com/microsoft/typescript-go.
 */

import type { ScriptKind, SourceFile } from 'typescript/ast';

import { isFatalError } from '@markuplint/shared';
import { ScriptTarget } from 'typescript/ast';
import { serverFS } from 'typescript/fs';
import { API, JsxEmit } from 'typescript/sync';

/**
 * The compiler could not be started or did not answer. It is an environmental failure (tier 2 of
 * `@markuplint/shared`'s error tiers), so it is raised to the caller, never turned into "no result".
 */
export class TsApiError extends Error {
	override name = 'TsApiError';

	constructor(cause: unknown) {
		super(
			`The TypeScript compiler could not be used: ${cause instanceof Error ? cause.message : String(cause)}. ` +
				'@markuplint/pretenders runs the compiler as a child process, which needs the `typescript` package ' +
				'and its platform package `@typescript/typescript-<platform>` to be installed for this machine.',
			{ cause },
		);
	}
}

let api: API | null = null;

const closeListeners = new Set<() => void>();

/**
 * In-memory content that the compiler reads in place of the file on disk while
 * {@link withVirtualSources} runs, keyed by `/`-delimited absolute path. It is module state because
 * the compiler asks the API's file system callbacks, which cannot take it as an argument, so
 * {@link withVirtualSources} has to stay synchronous.
 */
let virtualSources: ReadonlyMap<string, string> | undefined;

/**
 * The API instance, started on the first call.
 *
 * @returns The running API
 */
export function tsApi(): API {
	api ??= new API({
		fs: {
			readFile: fileName => virtualSources?.get(fileName) ?? serverFS.useOS,
			fileExists: fileName => (virtualSources?.has(fileName) ? true : serverFS.useOS),
			// `useOS` hands the call to the operating system's file system: the compiler reads the project as it is.
			directoryExists: serverFS.useOS,
			getAccessibleEntries: serverFS.useOS,
			realpath: serverFS.useOS,
			stat: serverFS.useOS,
			writeFile: serverFS.noop,
			removeFile: serverFS.noop,
		},
	});
	return api;
}

/**
 * The API instance when one is running, without starting one.
 *
 * @returns The running API, or `null`
 */
export function peekTsApi(): API | null {
	return api;
}

/**
 * Calls `callback` with the API. A failure of the compiler process is a {@link TsApiError}, and the
 * instance is dropped, so that the next call starts a new process instead of failing the same way.
 *
 * @param callback - The work to do with the API
 * @returns What `callback` returns
 */
export function callTsApi<T>(callback: (api: API) => T): T {
	try {
		return callback(tsApi());
	} catch (error) {
		if (isFatalError(error) || error instanceof TsApiError) {
			throw error;
		}
		closeTsApi();
		throw new TsApiError(error);
	}
}

/**
 * Stops the child process. The next {@link tsApi} call starts a new one.
 */
export function closeTsApi() {
	const closing = api;
	api = null;
	if (closing) {
		for (const listener of closeListeners) {
			listener();
		}
		closing.close();
	}
}

/**
 * Registers `listener` to run when {@link closeTsApi} stops a running process, so a module that holds
 * handles of that process drops them.
 *
 * @param listener - Called before the process is stopped
 */
export function onTsApiClose(listener: () => void) {
	closeListeners.add(listener);
}

/**
 * Runs `callback` with `sources` read in place of the files of the same path.
 *
 * @param sources - In-memory content, keyed by `/`-delimited absolute path
 * @param callback - The work to do; it must be synchronous (see {@link virtualSources})
 * @returns What `callback` returns
 */
export function withVirtualSources<T>(sources: ReadonlyMap<string, string> | undefined, callback: () => T): T {
	const previous = virtualSources;
	virtualSources = sources;
	try {
		return callback();
	} finally {
		virtualSources = previous;
	}
}

/**
 * Drops the parsed source files the API keeps, so the next program parses every file again.
 */
export function clearTsSourceFileCache() {
	api?.clearSourceFileCache();
}

/**
 * Parses `text` into a source file.
 *
 * @param fileName - The name of the file; with `scriptKind` it tells the parser how to read the text
 * @param text - The source text
 * @param scriptKind - How to read the text, when the file name does not tell
 * @returns The syntax tree, readable for as long as it is referenced
 */
export function parseSource(fileName: string, text: string, scriptKind?: ScriptKind): SourceFile {
	return callTsApi(api => {
		const retained = api.createSourceFile(fileName, text, scriptKind === undefined ? undefined : { scriptKind });
		const { sourceFile } = retained;
		retained.dispose();
		return sourceFile;
	});
}

/**
 * Whether the TypeScript parser finds a syntax error in `source`. The file name only tells it how to
 * read the source (`.tsx` for JSX, `.js` for JavaScript, where type annotations are errors); nothing
 * is resolved and no library is loaded. `transpileModule` reports the syntactic diagnostics alone,
 * so no program is needed.
 *
 * @param fileName - The name of the file the source is read as
 * @param source - The source text
 * @returns `true` when the parser reports a syntax error
 */
export function hasSyntaxError(fileName: string, source: string): boolean {
	const { diagnostics } = callTsApi(api =>
		api.transpileModule(source, {
			fileName,
			reportDiagnostics: true,
			compilerOptions: {
				allowJs: true,
				jsx: JsxEmit.Preserve,
				target: ScriptTarget.Latest,
				noLib: true,
				noResolve: true,
			},
		}),
	);
	return (diagnostics?.length ?? 0) > 0;
}
