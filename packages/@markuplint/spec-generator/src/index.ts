import type { ExtendedSpec } from '@markuplint/ml-spec';

import { writeFile } from 'node:fs/promises';

import { getAria } from './aria.js';
import { getReferences } from './fetch.js';
import { getGlobalAttrs } from './global-attrs.js';
import { getElements } from './html-elements.js';
import { readJson } from './read-json.js';

export type Options = {
	readonly outputFilePath: string;
	readonly htmlFilePattern: string;
	readonly commonAttrsFilePath: string;
	readonly commonContentsFilePath: string;
};

export async function main({ outputFilePath, htmlFilePattern, commonAttrsFilePath, commonContentsFilePath }: Options) {
	const [specs, globalAttrs, aria] = await Promise.all([
		getElements(htmlFilePattern),
		getGlobalAttrs(commonAttrsFilePath),
		getAria(),
	]);

	const cites = getReferences();

	const json: ExtendedSpec = {
		cites,
		def: {
			'#globalAttrs': globalAttrs,
			'#aria': aria,
			'#contentModels': readJson(commonContentsFilePath).models,
		},
		specs: [...specs],
	};

	const jsonString = JSON.stringify(json, null, 2);

	await writeFile(outputFilePath, jsonString);

	// eslint-disable-next-line no-console
	console.log(`🎁 Output: ${outputFilePath}`);
}
