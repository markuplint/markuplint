import path from 'node:path';

import { isPluginModuleName } from './is-plugin-module-name.js';
import { isPresetModuleName } from './is-preset-module-name.js';
import { moduleExists } from './module-exists.js';
import { isRelativePath } from './path-utils.js';

/**
 * Resolves a value of a configuration that names a module or a file: a module name stays as it
 * is, and a path becomes absolute against `dir`.
 *
 * A value spelled as a path (`./`, `../`, `.`, `..`, with either separator, or absolute) and a
 * value with the `!` prefix of an exclusion are resolved without asking `moduleExists()`, which
 * resolves a relative specifier from where markuplint is installed, not from the configuration: a
 * file by that name there would make the value a module, keep it relative, and have it read from
 * the working directory later. Installed in a project's `node_modules`, this package's `lib/` lies
 * four directories below the project root (`node_modules/@markuplint/file-resolver/lib/`), so a
 * configuration four directories below the root collided with the root's own `.markuplintrc`
 * through `../../../../.markuplintrc`, and `../package.json` names this package's own. Any other
 * value is tried as a module first, as the documentation of `extends` and its kin describes.
 *
 * @param dir - The directory of the configuration file that declares the value
 * @param pathOrModName - The value, possibly with the `!` prefix of an exclusion
 * @returns The module name as it is, or the absolute path, with the `!` prefix kept
 */
export async function resolveNameOrAbsPath(dir: string, pathOrModName: string) {
	const bangAndPath = /^(!)(.*)/.exec(pathOrModName) ?? [];
	const bang = bangAndPath[1] ?? '';
	const pathname = bangAndPath[2] ?? pathOrModName;

	const isPath = bang !== '' || path.isAbsolute(pathname) || isRelativePath(pathname);
	if (!isPath && (isPresetModuleName(pathname) || isPluginModuleName(pathname) || (await moduleExists(pathname)))) {
		return pathOrModName;
	}

	return bang + path.resolve(dir, pathname);
}
