/**
 * @module component-scanner
 *
 * Type definitions for the Companion Module pattern.
 * Each framework parser package provides its own `component-scanner` subpath
 * implementing these interfaces. The pretenders package owns the types;
 * parser packages import them for implementation.
 */

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
	/** Extracted script/ESM source block for import analysis */
	readonly scriptSource?: ComponentScanScriptSource;
	/** SVG namespace indicator (only set when root is in SVG namespace) */
	readonly namespace?: 'svg';
	/** Line number of the root element in the source */
	readonly line?: number;
	/** Column number of the root element in the source */
	readonly col?: number;
}

/**
 * A static attribute extracted from a component's root element.
 */
export interface ComponentScanAttr {
	/** The attribute name */
	readonly name: string;
	/** The attribute value (omitted for boolean attributes) */
	readonly value?: string;
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
}
