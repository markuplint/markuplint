import type { SpecConfig } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import path from 'node:path';

import { generalImport } from './general-import.js';
import { toRegexp } from './utils.js';

const caches = new Map<string, MLMLSpec | ExtendedSpec>();

/**
 * Loading and importing form specs.
 *
 * Import a package or load a local file if regexp matches `filePath`.
 * ```json
 * {
 *   "specs": {
 *     "\\.html$": "aaa-aaa",
 *     "\\.ext$": "./bbb-bbb.json"
 *   },
 * }
 * ```
 *
 * The below ways are deprecated.
 *
 * ```json
 * {
 *   "specs": "xxx-xxx",
 * }
 * ```
 * ```json
 * {
 *   "specs": ["xxx-xxx", "./yyy-yyy.json"],
 * }
 * ```
 *
 * @param filePath The lintee file path
 * @param specConfig The `spec` property part of the config
 * @returns
 */
export async function resolveSpecs(filePath: string, specConfig?: SpecConfig) {
	const htmlSpec = await importSpecs<MLMLSpec>('@markuplint/html-spec');
	const extendedSpecs: ExtendedSpec[] = [];

	if (specConfig) {
		if (typeof specConfig === 'string') {
			const spec = await importSpecs<ExtendedSpec>(specConfig);
			extendedSpecs.push(spec);
		} else {
			for (const pattern of Object.keys(specConfig)) {
				// eslint-disable-next-line unicorn/prefer-regexp-test
				if (path.basename(filePath).match(toRegexp(pattern))) {
					const specModName = specConfig[pattern];
					if (!specModName) {
						continue;
					}
					const spec = await importSpecs<ExtendedSpec>(specModName);
					extendedSpecs.push(spec);
				}
			}
		}
	}

	const schemas = [htmlSpec, ...extendedSpecs] as const;

	return {
		schemas,
	};
}

async function importSpecs<T>(specModName: string) {
	{
		// @ts-ignore
		const spec: T = caches.get(specModName);
		if (spec) {
			return spec;
		}
	}

	const spec = await generalImport<T>(specModName);

	if (!spec) {
		throw new Error(`Spec "${specModName}" is not found.`);
	}

	caches.set(specModName, spec);
	return spec;
}
