import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import path from 'path';

import { toRegxp } from '@markuplint/ml-config';

type SpecConfig = Record<string, string> | string[] | string;

const specs = new Map<string, MLMLSpec | ExtendedSpec>();

export async function resolveSpecs(filePath: string, specConfig?: SpecConfig) {
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
	// @ts-ignore
	const entity: T = specs.get(specModName);
	if (entity) {
		return entity;
	}
	const spec: T = (await import(specModName)).default;
	specs.set(specModName, spec);
	return spec;
}
