import type { SpecConfig, SpecConfig_v1 } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import path from 'path';

import { toRegxp } from '@markuplint/ml-config';

const caches = new Map<string, MLMLSpec | ExtendedSpec>();

export async function resolveSpecs(filePath: string, specConfig?: SpecConfig | SpecConfig_v1) {
	const htmlSpec = await importSpecs<MLMLSpec>('@markuplint/html-spec');
	const extendedSpecs: ExtendedSpec[] = [];

	if (specConfig) {
		if (typeof specConfig === 'string') {
			const spec = await importSpecs<ExtendedSpec>(specConfig);
			extendedSpecs.push(spec);
		} else if (Array.isArray(specConfig)) {
			for (const specModName of specConfig) {
				const spec = await importSpecs<ExtendedSpec>(specModName);
				extendedSpecs.push(spec);
			}
		} else {
			for (const pattern of Object.keys(specConfig)) {
				if (path.basename(filePath).match(toRegxp(pattern))) {
					const specModName = specConfig[pattern];
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
	const spec: T = (await import(specModName)).default;
	caches.set(specModName, spec);
	return spec;
}
