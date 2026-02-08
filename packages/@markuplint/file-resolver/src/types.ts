import type { OptimizedConfig } from '@markuplint/ml-config';
import type { Plugin } from '@markuplint/ml-core';

/**
 * A fully resolved configuration set including merged config, plugins, source file paths,
 * and any errors encountered during resolution.
 */
export interface ConfigSet {
	/** The merged and optimized configuration */
	readonly config: OptimizedConfig;
	/** The resolved plugins */
	readonly plugins: readonly Plugin[];
	/** The set of config file paths that contributed to this configuration */
	readonly files: ReadonlySet<string>;
	/** Errors encountered during config loading or resolution */
	readonly errs: readonly Readonly<Error>[];
}

/**
 * A lint target: either a file path/glob string, or an inline source code object.
 */
export type Target =
	| string
	| {
			/**
			 * Target source code of evaluation
			 */
			readonly sourceCode: string;

			/**
			 * File names when `sourceCodes`
			 */
			readonly name?: string;

			/**
			 * Workspace path when `sourceCodes`
			 */
			readonly workspace?: string;
	  };
