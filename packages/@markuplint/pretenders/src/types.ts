import type { PretenderScanOptions, Pretender } from '@markuplint/ml-config';

/**
 * A scan method function signature used by pretender scanners.
 * Accepts a list of absolute file paths and optional scan options,
 * and returns a promise resolving to an array of discovered pretender mappings.
 *
 * @template O - The scan options type, extending PretenderScanOptions
 */
export type PretenderScannerScanMethod<O extends PretenderScanOptions = PretenderScanOptions> =
	/**
	 * @param files Absolute file paths. If it includes a relative path, throw an error.
	 * @param options - Optional scan configuration
	 */
	(files: readonly string[], options?: Readonly<O>) => Promise<Pretender[]>;

/**
 * The CSS selector string that identifies a component (e.g., the component name).
 * Derived from the `selector` property of a Pretender.
 */
export type Identifier = Pretender['selector'];

/**
 * The native HTML element identity that a component pretends to be.
 * Can be a simple element name string or an object with detailed mapping.
 * Derived from the `as` property of a Pretender.
 */
export type Identity = Pretender['as'];

/**
 * An import path string used to uniquely identify a component across files.
 * When provided, this is used as the map key instead of the component name,
 * enabling disambiguation of identically named components from different locations
 * (e.g., `../A/Button.vue` vs `../B/Button.vue`).
 */
export type ImportPath = string;

/**
 * Represents an attribute found on a JSX element during scanning.
 */
export type Attr = {
	/** The kind of attribute: static string, boolean, dynamic expression, or spread */
	readonly nodeType: 'static' | 'boolean' | 'dynamic' | 'spread';
	/** The attribute name */
	readonly name: string;
	/** The attribute value (empty string for boolean, 'N/A' for spread) */
	readonly value: string;
	/** Optional type annotation for the attribute */
	readonly type?: string;
};
