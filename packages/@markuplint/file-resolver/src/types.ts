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
