import { MLMLSpec } from '@markuplint/ml-spec';
import fs from 'fs';
import { getAria } from './aria';
import { getGlobalAttrs } from './global-attrs';
import { getHTMLElements } from './html-elements';
import { getReferences } from './fetch';
import path from 'path';
import util from 'util';

const writeFile = util.promisify(fs.writeFile);

async function main() {
	const outputFilePath = path.resolve(__dirname, '../index.json');

	const [specs, globalAttrs, { roles, arias }] = await Promise.all([
		await getHTMLElements(),
		await getGlobalAttrs(),
		await getAria(),
	]);

	const cites = getReferences();

	const json: MLMLSpec = {
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

	// eslint-disable-next-line no-console
	console.log(`🎁 Output: ${outputFilePath}`);
}

main();
