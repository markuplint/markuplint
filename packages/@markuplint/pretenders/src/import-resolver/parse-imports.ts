/**
 * @module parse-imports
 *
 * Extracts import bindings from ESM source text using es-module-lexer.
 * Since es-module-lexer provides specifier positions but not local binding names,
 * regex parsing on the statement slices supplements the extraction.
 *
 * es-module-lexer reads JavaScript and TypeScript (`enum`, annotations and `satisfies` pass
 * through), but not JSX: it throws on a source whose JSX it cannot tokenize (`{items.map(i =>
 * <li />)}`, a fragment, an apostrophe in JSX text), and on markdown in MDX
 * (https://github.com/guybedford/es-module-lexer#readme). A source it rejects is read with the
 * TypeScript parser (`collectImportBindings`) when that finds no syntax error, under the script
 * kind the caller gives (`ts.ScriptKind.TSX` for JSX), so the imports are not lost to the lexer's
 * limits; a source that is broken, or JSX read as TypeScript, has no bindings.
 */

import type { DynamicImportName } from './dynamic-import-name.js';
import type { ImportBinding } from './types.js';

import { isFatalError } from '@markuplint/shared';
import { init, parse } from 'es-module-lexer';
import ts from 'typescript';

import { collectImportBindings } from './analyze-jsx-imports.js';
import { dynamicBindings, dynamicImportNames } from './dynamic-import-name.js';

/** Matches `import type` — TypeScript type-only import (no runtime binding) */
const RE_TYPE_ONLY_IMPORT = /^import\s+type\s/;

/** Matches the `defer` phase keyword of `import defer * as X from` */
const RE_DEFER_PHASE = /^import\s+defer\s+/;

/** Matches `import X from` — default import */
const RE_DEFAULT_IMPORT = /import\s+(\w+)\s+from/;

/** Matches `import { ... } from` — named imports */
const RE_NAMED_IMPORTS = /import\s*\{([^}]+)\}\s*from/;

/** Matches `import * as X from` — namespace import */
const RE_NAMESPACE_IMPORT = /import\s*\*\s*as\s+(\w+)\s+from/;

/** Matches `import X, { ... } from` — default + named imports */
const RE_DEFAULT_AND_NAMED = /import\s+(\w+)\s*,\s*\{([^}]+)\}\s*from/;

/** Matches `import X, * as Y from` — default + namespace imports */
const RE_DEFAULT_AND_NAMESPACE = /import\s+(\w+)\s*,\s*\*\s*as\s+(\w+)\s+from/;

let initPromise: Promise<void> | null = null;

/**
 * Safe to call multiple times; the WASM module initializes only once.
 *
 * A rejected initialization is evicted from the cache so the next call retries.
 * Otherwise every later call would rethrow the same error until the process restarts,
 * which a long-lived host such as the language server cannot recover from.
 */
async function ensureInit() {
	initPromise ??= init().catch((error: unknown) => {
		initPromise = null;
		throw error;
	});
	await initPromise;
}

/**
 * Handles `as` aliases (e.g., `Foo as Bar`) and whitespace/trailing commas.
 */
function parseNamedEntries(raw: string, source: string): ImportBinding[] {
	const bindings: ImportBinding[] = [];

	for (const entry of raw.split(',')) {
		const trimmed = entry.trim();
		if (!trimmed) {
			continue;
		}

		// Skip inline type-only imports: `import { type Foo } from '...'`
		if (/^type\s+/.test(trimmed)) {
			continue;
		}

		const asParts = trimmed.split(/\s+as\s+/);
		if (asParts.length === 2 && asParts[0] && asParts[1]) {
			bindings.push({
				localName: asParts[1].trim(),
				importedName: asParts[0].trim(),
				source,
				type: 'named',
			});
		} else {
			bindings.push({
				localName: trimmed,
				importedName: trimmed,
				source,
				type: 'named',
			});
		}
	}

	return bindings;
}

function extractBindingsFromStatement(statementText: string, source: string): ImportBinding[] {
	// TypeScript `import type { ... }` — no runtime binding, skip entirely
	if (RE_TYPE_ONLY_IMPORT.test(statementText)) {
		return [];
	}

	// Try default + named: `import X, { A, B } from '...'`
	const defaultAndNamed = RE_DEFAULT_AND_NAMED.exec(statementText);
	if (defaultAndNamed?.[1] && defaultAndNamed[2] !== undefined) {
		return [
			{
				localName: defaultAndNamed[1],
				importedName: 'default',
				source,
				type: 'default',
			},
			...parseNamedEntries(defaultAndNamed[2], source),
		];
	}

	// Try default + namespace: `import X, * as Y from '...'`
	const defaultAndNamespace = RE_DEFAULT_AND_NAMESPACE.exec(statementText);
	if (defaultAndNamespace?.[1] && defaultAndNamespace[2]) {
		return [
			{
				localName: defaultAndNamespace[1],
				importedName: 'default',
				source,
				type: 'default',
			},
			{
				localName: defaultAndNamespace[2],
				importedName: '*',
				source,
				type: 'namespace',
			},
		];
	}

	// Try namespace: `import * as X from '...'`
	const namespace = RE_NAMESPACE_IMPORT.exec(statementText);
	if (namespace?.[1]) {
		return [
			{
				localName: namespace[1],
				importedName: '*',
				source,
				type: 'namespace',
			},
		];
	}

	// Try named: `import { A, B as C } from '...'`
	const named = RE_NAMED_IMPORTS.exec(statementText);
	if (named?.[1] !== undefined) {
		return parseNamedEntries(named[1], source);
	}

	// Try default: `import X from '...'`
	const defaultImport = RE_DEFAULT_IMPORT.exec(statementText);
	if (defaultImport?.[1]) {
		return [
			{
				localName: defaultImport[1],
				importedName: 'default',
				source,
				type: 'default',
			},
		];
	}

	// Side-effect import (`import '...'`) — no bindings to extract
	return [];
}

/**
 * The extension of the file name that tells the TypeScript parser how to read the source, for the
 * script kinds this module is given (`ts.ScriptKind.TS` by default, `TSX` for MDX, and `TSX` / `JSX`
 * of a script block's `lang`); any other kind reads as `.ts`.
 */
const EXTENSIONS: ReadonlyMap<ts.ScriptKind, string> = new Map([
	[ts.ScriptKind.TS, '.ts'],
	[ts.ScriptKind.TSX, '.tsx'],
	[ts.ScriptKind.JS, '.js'],
	[ts.ScriptKind.JSX, '.jsx'],
]);

/**
 * The source parsed by the TypeScript parser, or `null` when it finds a syntax error in it. The
 * syntactic diagnostics are asked of a program that holds that one file (no library, nothing
 * resolved), which is the public way to get them (`parseDiagnostics` of the source file is internal)
 * and parses the source once. It runs only for a source the lexer has rejected, which is the
 * exception except for MDX, whose markdown the lexer rejects whenever the file has any.
 */
function parseWithoutSyntaxError(source: string, scriptKind: ts.ScriptKind): ts.SourceFile | null {
	const fileName = `script${EXTENSIONS.get(scriptKind) ?? '.ts'}`;
	const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind);
	const program = ts.createProgram({
		rootNames: [fileName],
		options: {
			noLib: true,
			noResolve: true,
			allowJs: true,
			jsx: ts.JsxEmit.Preserve,
			target: ts.ScriptTarget.Latest,
		},
		host: {
			getSourceFile: name => (name === fileName ? sourceFile : undefined),
			getDefaultLibFileName: () => 'lib.d.ts',
			writeFile: () => {},
			getCurrentDirectory: () => '',
			getCanonicalFileName: name => name,
			useCaseSensitiveFileNames: () => true,
			getNewLine: () => '\n',
			fileExists: name => name === fileName,
			readFile: () => {},
		},
	});
	return program.getSyntacticDiagnostics(sourceFile).length === 0 ? sourceFile : null;
}

/**
 * The names {@link dynamicImportNames} gives the dynamic `import()` calls of `source`, by the
 * position of their `import` keyword, which is where es-module-lexer reports them (`importStart`).
 * es-module-lexer has no notion of what a call is assigned to, so the source is read once more,
 * with the TypeScript parser: it is done only for a source that has a dynamic import to name.
 */
function namesOfDynamicImports(
	source: string,
	scriptKind: ts.ScriptKind,
): ReadonlyMap<number, readonly DynamicImportName[]> {
	const names = new Map<number, readonly DynamicImportName[]>();
	const sourceFile = ts.createSourceFile('script', source, ts.ScriptTarget.Latest, true, scriptKind);

	const visit = (node: ts.Node) => {
		if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			names.set(node.getStart(sourceFile), dynamicImportNames(node));
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);

	return names;
}

/**
 * Processes static imports and dynamic imports with string literal specifiers.
 * `import.meta` references, dynamic imports with non-literal specifiers
 * (template literals, variables) and source-phase imports are excluded.
 *
 * @param source - The script source to read the imports of
 * @param scriptKind - How to read the source for the names of dynamic imports; MDX's ESM may hold
 *   JSX, which only `ts.ScriptKind.TSX` reads
 */
export async function parseImports(
	source: string,
	scriptKind: ts.ScriptKind = ts.ScriptKind.TS,
): Promise<readonly ImportBinding[]> {
	await ensureInit();

	let imports;
	try {
		[imports] = parse(source);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		// The lexer reports what it cannot read as a plain `Error`: non-JS content (MDX with
		// markdown), JSX it cannot tokenize, or source that is broken. The TypeScript parser reads
		// the JSX (for the `scriptKind` that allows it), so those bindings are not dropped for the
		// lexer's sake; a source it finds a syntax error in has no bindings, as a lexer error always had.
		const sourceFile = parseWithoutSyntaxError(source, scriptKind);
		return sourceFile ? collectImportBindings(sourceFile) : [];
	}

	const bindings: ImportBinding[] = [];
	let namesByPosition: ReadonlyMap<number, readonly DynamicImportName[]> | undefined;

	for (const imp of imports) {
		if (imp.type === 'import-meta') {
			continue;
		}

		// `import source x from` / `import.source(…)` bind a module source object, not an export,
		// so there is no component binding to follow.
		if (imp.phase === 'source') {
			continue;
		}

		// `specifier` is absent for non-literal dynamic imports. A template literal such as
		// `import(`./${name}.vue`)` is reported as a glob (`./*.vue`), which is not a real
		// module path, so it must be excluded as well.
		if (!imp.specifier || (imp.type === 'dynamic' && imp.glob)) {
			continue;
		}

		if (imp.type === 'dynamic') {
			// Dynamic import with a string literal specifier (e.g., `import('./Foo.vue')`)
			// It has a local binding name only when it is assigned to one (see `dynamicImportNames`);
			// otherwise we use '*' as a sentinel with `type: 'dynamic'`. The whole module read into a
			// variable (`const UI = await import('./ui')`) is a `type: 'namespace'` binding.
			namesByPosition ??= namesOfDynamicImports(source, scriptKind);
			bindings.push(...dynamicBindings(namesByPosition.get(imp.importStart) ?? [], imp.specifier));
			continue;
		}

		// Static imports (`import …` and `export * from …`; the latter yields no bindings).
		// The `defer` phase keyword (`import defer * as ns from`) is dropped so the regexes match.
		const rawStatement = source.slice(imp.importStart, imp.importEnd);
		const statementText = imp.phase === 'defer' ? rawStatement.replace(RE_DEFER_PHASE, 'import ') : rawStatement;
		bindings.push(...extractBindingsFromStatement(statementText, imp.specifier));
	}

	return bindings;
}
