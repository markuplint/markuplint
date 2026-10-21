/**
 * @module component-scanner
 *
 * Type definitions for the Companion Module pattern.
 * Each framework parser package provides its own `component-scanner` subpath
 * implementing these interfaces. The pretenders package owns the types;
 * parser packages import them for implementation.
 */

import type { NamespaceURI } from '@markuplint/ml-ast';

/**
 * Result of scanning a single component file for its root element information.
 */
export interface ComponentScanResult {
	/** The root element tag name, or `null` if the component is fragment-like */
	readonly rootElement: string | null;
	/** Static attributes on the root element */
	readonly attrs: readonly ComponentScanAttr[];
	/** Whether the component template contains slot usage (Vue `<slot>`, Svelte `{@render}`, etc.) */
	readonly hasSlots: boolean;
	/**
	 * The elements that directly wrap a slot. Absent for scanners that do not report
	 * them, in which case only {@link hasSlots} is known.
	 */
	readonly slotWrappers?: readonly ComponentScanSlotWrapper[];
	/** The direct children of the root element (see {@link ComponentScanContent}) */
	readonly rootContents?: readonly ComponentScanContent[];
	/** Extracted script/ESM source block for import analysis */
	readonly scriptSource?: ComponentScanScriptSource;
	/**
	 * The expressions of the spread attributes of the root element: `{...rest}` in Svelte
	 * and Astro, `v-bind="$attrs"` in Vue. Absent when there is none.
	 */
	readonly spreads?: readonly string[];
	/**
	 * Whether the template has another root beside the root element, which Vue does not
	 * fall attributes through to. Only Vue reports it. A `v-else` branch is not another root.
	 */
	readonly hasSiblingRoots?: true;
	/** SVG namespace indicator (only set when root is in SVG namespace) */
	readonly namespace?: 'svg';
	/** Line number of the root element in the source */
	readonly line?: number;
	/** Column number of the root element in the source */
	readonly col?: number;
}

/**
 * An attribute extracted from an element of a component: a static one with its value, or
 * a `dynamic` one whose value is an expression.
 */
export interface ComponentScanAttr {
	/** The attribute name */
	readonly name: string;
	/** The attribute value (omitted for boolean attributes) */
	readonly value?: string;
	/** The attribute is present and its value is an expression, unknown at scan time. `value` is omitted. */
	readonly dynamic?: true;
	/**
	 * The source of the expression of a `dynamic` attribute that is written as one expression
	 * (`:type="kind"`, `type={kind}`, `{type}`), so that a prop of the component passed as
	 * it is can be told from any other expression. Absent for a value that has an expression
	 * inside (`"a-{b}"`), and for a name written in more than one form.
	 */
	readonly expression?: string;
}

/**
 * A direct child of an element that wraps a slot. A native element is itself
 * (its own content is not tracked), the slot is its position, and anything
 * else (an expression, a block, a component) is unknown content.
 */
export type ComponentScanContent =
	| { readonly element: string; readonly attrs?: readonly ComponentScanAttr[] }
	| { readonly slot: true }
	| { readonly dynamic: true };

/**
 * An element that directly wraps a slot. A component has no `attrs` and no
 * `contents`: what it renders is unknown.
 */
export interface ComponentScanSlotWrapper {
	/** The element name */
	readonly element: string;
	/** Whether it is the root element itself */
	readonly isRoot: boolean;
	/** Static attributes of the element */
	readonly attrs: readonly ComponentScanAttr[];
	/** The direct children of the element */
	readonly contents: readonly ComponentScanContent[];
	/**
	 * The namespace of the element when the elements between it and the root element decide
	 * it (`getNamespaceBelow` of `@markuplint/parser-utils`): inside `foreignObject`, or
	 * inside an `svg` or `math` that is not the root. Absent when it depends on where the
	 * root is rendered (a `<g>` root used inside `svg`), which ml-core resolves.
	 */
	readonly namespace?: NamespaceURI;
}

/**
 * A script/ESM source block extracted from a component file.
 * Used by import-resolver to analyze component imports.
 */
export interface ComponentScanScriptSource {
	/** The raw script content without delimiters */
	readonly content: string;
	/** The character offset of the content start within the original source */
	readonly offset: number;
	/**
	 * The `lang` attribute of the block as written (`tsx`, `ts`), for a language whose script block
	 * declares one and whose parser reports it (Vue). It decides whether the script holds JSX, which
	 * the import analysis reads with the TypeScript parser rather than with es-module-lexer.
	 */
	readonly lang?: string;
}

/**
 * Interface for framework-specific component scanners.
 * Implemented by each parser package's `component-scanner` subpath export.
 */
export interface ComponentScanner {
	/**
	 * Scans a single component source file and extracts root element information.
	 *
	 * @param sourceCode - The full source text of the component file
	 * @returns The scan result, or `null` if scanning fails or the file has no root element
	 */
	scanComponent(sourceCode: string): ComponentScanResult | null;

	/**
	 * Extracts the script/ESM source block from a component file.
	 * Optional — only needed for frameworks that embed scripts (Vue, Svelte, Astro).
	 *
	 * @param sourceCode - The full source text of the component file
	 * @returns The extracted script block, or `null` if none found
	 */
	extractScriptSource?(sourceCode: string): ComponentScanScriptSource | null;

	/**
	 * Extracts the expressions of the template that are to be read as script, each with the
	 * pattern that binds its result: `import('./C.svelte')` and `{ default: C }` of
	 * `{#await import('./C.svelte') then { default: C }}`. The script block does not hold them,
	 * so `extractScriptSource` does not see the imports they make, though Svelte documents the block as
	 * the way to render a component lazily (https://svelte.dev/docs/svelte/await).
	 * Optional — only a language whose template can load a module like that implements it (Svelte).
	 *
	 * The scanner reports the syntax as written and does not decide what an expression loads: the reader
	 * reads each as `const <value> = await <expression>`, as it reads the same code in a script.
	 *
	 * @param sourceCode - The full source text of the component file
	 * @returns The expressions in source order; none for a source that is not valid
	 */
	extractTemplateImports?(sourceCode: string): readonly ComponentScanTemplateImport[];
}

/**
 * An expression of a template that is read as script (see {@link ComponentScanner.extractTemplateImports}),
 * as the source text of it and of the pattern that binds its result.
 */
export interface ComponentScanTemplateImport {
	readonly expression: string;
	/** The pattern the result is bound to (`{ default: C }`, `m`); absent when the template binds none */
	readonly value?: string;
}
