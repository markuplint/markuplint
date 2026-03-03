/**
 * Represents a single import binding extracted from a source file.
 * Links a local name (used in template/code) to its source module path.
 */
export interface ImportBinding {
	/** The local name used in the file (e.g., `MyButton`, `default as Btn` → `Btn`) */
	readonly localName: string;
	/** The imported name from the source module (e.g., `default`, `MyButton`, or `*` for namespace) */
	readonly importedName: string;
	/** The module specifier string (e.g., `./components/Button.vue`, `@/lib/utils`) */
	readonly source: string;
	/** The type of import binding */
	readonly type: 'default' | 'named' | 'namespace' | 'dynamic';
}

/**
 * The result of analyzing imports in a source block.
 */
export interface ImportAnalysisResult {
	/** All import bindings found in the source */
	readonly bindings: readonly ImportBinding[];
}
