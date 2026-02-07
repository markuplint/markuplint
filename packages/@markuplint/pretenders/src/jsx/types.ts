import type { PretenderScanOptions } from '@markuplint/ml-config';

/**
 * Configuration options for the JSX pretender scanner.
 * Extends the base scan options with JSX-specific settings for handling
 * fragments, styled-components, and wrapper patterns.
 */
export interface PretenderScanJSXOptions extends PretenderScanOptions {
	/** Patterns matching component names to treat as transparent fragments (children are scanned instead) */
	asFragment?: readonly (Readonly<RegExp> | string)[];
	/** Patterns matching tagged template expressions for CSS-in-JS libraries (e.g., styled.button) */
	taggedStylingComponent?: readonly (Readonly<RegExp> | string)[];
	/** Patterns matching HOC or wrapper function calls that extend another component */
	extendingWrapper?: readonly (string | Readonly<RegExp> | ExtendingWrapperCallerOptions)[];
}

/**
 * Configuration for identifying a wrapper/HOC function call and which
 * argument position contains the wrapped component reference.
 */
export type ExtendingWrapperCallerOptions = {
	/** Pattern to match the wrapper function identifier */
	readonly identifier: string | Readonly<RegExp>;
	/** The 1-based argument position that contains the wrapped component */
	readonly numberOfArgument: number;
};
