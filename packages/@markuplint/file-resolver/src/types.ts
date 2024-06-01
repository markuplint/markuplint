import type { OptimizedConfig } from '@markuplint/ml-config';
import type { Plugin } from '@markuplint/ml-core';

export interface ConfigSet {
	readonly config: OptimizedConfig;
	readonly plugins: readonly Plugin[];
	readonly files: ReadonlySet<string>;
	readonly errs: readonly Readonly<Error>[];
}

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
