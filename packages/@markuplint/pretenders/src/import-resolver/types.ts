/**
 * Represents a single import binding extracted from a source file.
 * Links a local name (used in template/code) to its source module path.
 */
export interface ImportBinding {
	/**
	 * The local name used in the file (e.g., `MyButton`, `default as Btn` → `Btn`).
	 *
	 * A dynamic import (`type === 'dynamic'`) has a local binding name only when it is
	 * assigned to one: the variable of `const X = lazy(() => import('./X'))`, the key
	 * of `components: { X: defineAsyncComponent(() => import('./X.vue')) }`, or the variable
	 * an awaited import is read into (`const { X } = await import('./X')`). Otherwise this
	 * is set to `'*'` as a sentinel value. Use the `type` field to tell a dynamic import
	 * from a namespace import (which also uses `'*'` for `importedName`).
	 */
	readonly localName: string;
	/**
	 * The name a template refers to the component by, when it is not `localName`: the key of the Options API
	 * of Vue that registers it (`components: { 'foo-bar': Foo }` is `'foo-bar'` for the binding `Foo`;
	 * `Btn: MyButton`, `Btn` for `MyButton`). Vue resolves a tag to that key, and to none of the names an import
	 * gives, so it is what a lookup by a tag name or a selector reads. Absent when it is `localName`.
	 */
	readonly registeredAs?: string;
	/**
	 * The imported name from the source module (e.g., `default`, `MyButton`, or `*` for
	 * namespace and for a dynamic import that is not assigned to a name). A named dynamic
	 * import is `default`, or the export that `.then(m => m.X)`, `.then(m => ({ default: m.X }))`
	 * or the destructuring of an awaited import (`const { X } = await import('./X')`) reads.
	 */
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
