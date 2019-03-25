import fs from 'fs';
import path from 'path';
import util from 'util';
import fetch, { getReferences } from './fetch';
import { ElementSpec } from './types';
import { getGlobalAttrs } from './global-attrs';

const writeFile = util.promisify(fs.writeFile);

async function main() {
	const outputFilePath = path.resolve(__dirname, `../__test.json`);

	const globalAttrs = await getGlobalAttrs();

	const cites = getReferences();

	const json = JSON.stringify(
		{
			cites,
			ref: {
				'#globalAttrs': globalAttrs,
			},
		},
		null,
		2,
	);

	await writeFile(outputFilePath, json);
	console.log(`🎁 Output: ${outputFilePath}`);
}

main();
