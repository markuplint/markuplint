import type { ExtendedSpec } from '@markuplint/ml-spec';

import fs from 'fs';
import path from 'path';
import util from 'util';

import { getAria } from './aria';
import { getReferences } from './fetch';
import { getGlobalAttrs } from './global-attrs';
import { getElements } from './html-elements';
import { readJson } from './read-json';
// import { getSVG } from './svg';

const writeFile = util.promisify(fs.writeFile);

async function main() {
	const outputFilePath = path.resolve(__dirname, '../index.json');

	const [specs, globalAttrs, aria /*, svg*/] = await Promise.all([
		await getElements(),
		await getGlobalAttrs(),
		await getAria(),
		// await getSVG(),
	]);

	const cites = getReferences();

	const json: ExtendedSpec = {
		cites,
		def: {
			'#globalAttrs': globalAttrs,
			'#aria': aria,
			'#contentModels': (await readJson('../src/spec-common.contents.json')).models,
		},
		specs: [...specs /*, ...svg*/],
	};

	const jsonString = JSON.stringify(json, null, 2);

	await writeFile(outputFilePath, jsonString);

	// eslint-disable-next-line no-console
	console.log(`🎁 Output: ${outputFilePath}`);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
