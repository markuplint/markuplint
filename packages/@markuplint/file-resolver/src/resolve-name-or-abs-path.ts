import path from 'node:path';

import { isPluginModuleName } from './is-plugin-module-name.js';
import { isPresetModuleName } from './is-preset-module-name.js';
import { moduleExists } from './module-exists.js';

export async function resolveNameOrAbsPath(dir: string, pathOrModName: string) {
	if ((await moduleExists(pathOrModName)) || isPresetModuleName(pathOrModName) || isPluginModuleName(pathOrModName)) {
		return pathOrModName;
	}
	const bangAndPath = /^(!)(.*)/.exec(pathOrModName) ?? [];
	const bang = bangAndPath[1] ?? '';
	const pathname = bangAndPath[2] ?? pathOrModName;
	const absPath = path.resolve(dir, pathname);
	return bang + absPath;
}
