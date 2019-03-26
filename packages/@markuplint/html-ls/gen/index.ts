import fs from 'fs';
import path from 'path';
import util from 'util';
import fetch, { getReferences } from './fetch';
import { ElementSpec, MLMLSpecJSON } from './types';
import { getGlobalAttrs } from './global-attrs';
import { getHTMLElements } from './html-elements';
import { getAria } from './aria';

const writeFile = util.promisify(fs.writeFile);

async function main() {
	const outputFilePath = path.resolve(__dirname, `../index.json`);

	const specs = await getHTMLElements();
	const globalAttrs = await getGlobalAttrs();
	const { roles, arias } = await getAria();

	const cites = getReferences();

	const json: MLMLSpecJSON = {
		$schema: './ml-specs.schema.json',
		cites,
		def: {
			'#globalAttrs': globalAttrs,
			'#roles': roles,
			'#ariaAttrs': arias,
		},
		specs,
	};

	const jsonString = JSON.stringify(json, null, 2);

	await writeFile(outputFilePath, jsonString);
	console.log(`🎁 Output: ${outputFilePath}`);
}

main();
