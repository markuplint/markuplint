/**
 * Represents a single import binding extracted from a source file.
 * Links a local name (used in template/code) to its source module path.
 */
export interface ImportBinding {
	/**
	 * The local name used in the file (e.g., `MyButton`, `default as Btn` → `Btn`).
	 *
	 * For dynamic imports (`type === 'dynamic'`), this is set to `'*'` as a sentinel
	 * value because dynamic imports have no local binding name. Use the `type` field
	 * to distinguish dynamic imports from namespace imports (which also use `'*'`
	 * for `importedName`).
	 */
	readonly localName: string;
	/** The imported name from the source module (e.g., `default`, `MyButton`, or `*` for namespace/dynamic) */
	readonly importedName: string;
	/** The module specifier string (e.g., `./components/Button.vue`, `@/lib/utils`) */
	readonly source: string;
	/**
	 * The type of import binding:
	 * - `'default'` — `import X from '...'`
	 * - `'named'` — `import { X } from '...'`
	 * - `'namespace'` — `import * as X from '...'`
	 * - `'dynamic'` — `import('...')` with a string literal specifier
	 */
	readonly type: 'default' | 'named' | 'namespace' | 'dynamic';
}

/**
 * The result of analyzing imports in a source block.
 */
export interface ImportAnalysisResult {
	/** All import bindings found in the source */
	readonly bindings: readonly ImportBinding[];
}
