import cosmiconfig from 'cosmiconfig';

import {
	ConfigureFileJSON,
} from './JSONInterface';

const explorer = cosmiconfig('markuplint');

export default async function searchAndLoad (fileOrDir: string) {
	const data = await explorer.search(fileOrDir);

	// console.log(`search rc file on "${configDir}"`);
	if (!data || !data.config) {
		throw new Error('markuplint rc file not found');
	}
	const filePath: string = data.filepath;
	const config: ConfigureFileJSON = data.config as ConfigureFileJSON;

	// console.log(`RC file Loaded: "${filePath}"`);
	return {
		filePath,
		config,
	};
}

