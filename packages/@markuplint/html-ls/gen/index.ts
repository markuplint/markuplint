import { MLMLSpecJSON } from '@markuplint/ml-spec';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { getReferences } from './fetch';
import { getGlobalAttrs } from './global-attrs';
import { getHTMLElements } from './html-elements';
import { getAria } from './aria';

const writeFile = util.promisify(fs.writeFile);

async function main() {
	const outputFilePath = path.resolve(__dirname, `../index.json`);

	const [specs, globalAttrs, { roles, arias }] = await Promise.all([
		await getHTMLElements(),
		await getGlobalAttrs(),
		await getAria(),
	]);

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
