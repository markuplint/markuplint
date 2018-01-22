// TODO: @types
// @ts-ignore
import * as cosmiconfig from 'cosmiconfig';

import {
	ConfigureFileJSON,
} from './JSONInterface';

const explorer = cosmiconfig('markuplint');

export async function searchAndLoad (fileOrDir: string) {
	let data;

	// load as file
	try {
		data = await explorer.load(null, fileOrDir);
		// console.log({data, fileOrDir});
	} catch (err) {
		if (err.code !== 'EISDIR') {
			throw err;
		}
	}

	// load as dir
	if (!data) {
		data = await explorer.load(fileOrDir);
	}

	// console.log(`search rc file on "${configDir}"`);
	if (!data || !data.config) {
		throw new Error('markuplint rc file not found');
	}
	const filePath: string = data.filepath;
	const config: ConfigureFileJSON = data.config;

	// console.log(`RC file Loaded: "${filePath}"`);
	return {
		filePath,
		config,
	};
}

