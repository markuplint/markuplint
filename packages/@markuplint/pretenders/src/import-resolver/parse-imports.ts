/**
 * @module parse-imports
 *
 * Extracts import bindings from ESM source text using es-module-lexer.
 * Since es-module-lexer provides specifier positions but not local binding names,
 * regex parsing on the statement slices supplements the extraction.
 */

import type { ImportBinding } from './types.js';

import { init, parse } from 'es-module-lexer';

/** Matches `import type` — TypeScript type-only import (no runtime binding) */
const RE_TYPE_ONLY_IMPORT = /^import\s+type\s/;

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
 */
async function ensureInit() {
	initPromise ??= init;
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
 * `import.meta` references and dynamic imports with non-literal specifiers
 * (template literals, variables) are excluded.
 */
export async function parseImports(source: string): Promise<readonly ImportBinding[]> {
	await ensureInit();

	let imports;
	try {
		[imports] = parse(source);
	} catch {
		// Source may contain non-JS content (e.g., MDX with markdown).
		// Return empty bindings rather than propagating the parse error.
		return [];
	}

	const bindings: ImportBinding[] = [];

	for (const imp of imports) {
		// import.meta (d === -2) — always skip
		if (imp.d === -2) {
			continue;
		}

		// n = normalized module specifier (absent for template-literal dynamic imports)
		if (!imp.n) {
			continue;
		}

		if (imp.d >= 0) {
			// Dynamic import with a string literal specifier (e.g., `import('./Foo.vue')`)
			// Dynamic imports have no local binding name, so we use '*' as a sentinel.
			// Consumers should check `type === 'dynamic'` to distinguish from namespace imports.
			bindings.push({
				localName: '*',
				importedName: '*',
				source: imp.n,
				type: 'dynamic',
			});
			continue;
		}

		// Static imports (d === -1)
		// ss/se = statement start/end positions
		const statementText = source.slice(imp.ss, imp.se);
		bindings.push(...extractBindingsFromStatement(statementText, imp.n));
	}

	return bindings;
}
