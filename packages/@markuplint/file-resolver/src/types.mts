import type { Config } from '@markuplint/ml-config';
import type { Plugin } from '@markuplint/ml-core';

export type Nullable<T> = T | null | undefined;

export interface ConfigSet {
	config: Config;
	plugins: Plugin[];
	files: Set<string>;
	errs: Error[];
}

export type Target =
	| string
	| {
			/**
			 * Target source code of evaluation
			 */
			sourceCode: string;

			/**
			 * File names when `sourceCodes`
			 */
			name?: string;

			/**
			 * Workspace path when `sourceCodes`
			 */
			workspace?: string;
	  };
