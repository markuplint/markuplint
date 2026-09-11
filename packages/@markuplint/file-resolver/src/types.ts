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
	/**
	 * `overrides` keys (resolved to absolute globs by `OptimizedConfig`) that
	 * matched the target file, in the order they were applied — config-key
	 * order, so later entries win under `overrideMode: 'reset'`, the default.
	 * Absent — never an empty array — when no override matched this target
	 * file, whether because the config has no `overrides` at all or none of
	 * its globs matched.
	 */
	readonly appliedOverrides?: readonly string[];
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
