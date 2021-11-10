import type { MLMLSpec } from '@markuplint/ml-spec';

import fs from 'fs';
import path from 'path';
import util from 'util';

import { getAria } from './aria';
import getContentModels from './content-models';
import { getReferences } from './fetch';
import { getGlobalAttrs } from './global-attrs';
import { getHTMLElements } from './html-elements';
import { getSVG } from './svg';

const writeFile = util.promisify(fs.writeFile);

async function main() {
	const outputFilePath = path.resolve(__dirname, '../index.json');

	const [specs, globalAttrs, { roles, arias }, contentModels, svg] = await Promise.all([
		await getHTMLElements(),
		await getGlobalAttrs(),
		await getAria(),
		await getContentModels(),
		await getSVG(),
	]);

	const cites = getReferences();

	const json: MLMLSpec = {
		cites,
		def: {
			'#globalAttrs': globalAttrs,
			'#roles': roles,
			'#ariaAttrs': arias,
			'#contentModels': contentModels,
		},
		specs: [...specs, ...svg],
	};

	const jsonString = JSON.stringify(json, null, 2);

	await writeFile(outputFilePath, jsonString);

	// eslint-disable-next-line no-console
	console.log(`🎁 Output: ${outputFilePath}`);
}

main();
