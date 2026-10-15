/**
 * @module parse-imports
 *
 * Extracts import bindings from ESM source text using es-module-lexer.
 * Since es-module-lexer provides specifier positions but not local binding names,
 * regex parsing on the statement slices supplements the extraction.
 */

import type { ImportBinding } from './types.js';

import { isFatalError } from '@markuplint/shared';
import { init, parse } from 'es-module-lexer';

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
 * Processes static imports and dynamic imports with string literal specifiers.
 * `import.meta` references, dynamic imports with non-literal specifiers
 * (template literals, variables) and source-phase imports are excluded.
 */
export async function parseImports(source: string): Promise<readonly ImportBinding[]> {
	await ensureInit();

	let imports;
	try {
		[imports] = parse(source);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		// Source may contain non-JS content (e.g., MDX with markdown); the lexer reports
		// that as a plain `Error`. Return empty bindings rather than propagating it.
		return [];
	}

	const bindings: ImportBinding[] = [];

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
			// Dynamic imports have no local binding name, so we use '*' as a sentinel.
			// Consumers should check `type === 'dynamic'` to distinguish from namespace imports.
			bindings.push({
				localName: '*',
				importedName: '*',
				source: imp.specifier,
				type: 'dynamic',
			});
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
