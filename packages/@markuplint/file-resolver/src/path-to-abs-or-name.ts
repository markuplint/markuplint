import { resolveNameOrAbsPath } from './resolve-name-or-abs-path.js';

/**
 * Applies {@link resolveNameOrAbsPath} to a property of a configuration in whichever shape it
 * takes: one value, a list of values, or a map such as `parser` (an extension to a module or a
 * file) and `overrides` (a glob to a configuration).
 *
 * In a map, or in an entry of a list, every string value is resolved unless `resolveProps` names
 * the properties that hold a path, as `name` is the one of a `plugins` entry. The keys are left
 * alone unless `resolveKey` says they are paths, as the globs of `overrides` are; the values of
 * `overrides` are configurations in turn, which the caller resolves one by one.
 *
 * @template T - The shape of the property
 * @param dir - The directory of the configuration file that declares the property
 * @param filePath - The property, or `undefined` when the configuration does not hold it
 * @param resolveProps - The properties of a map, or of an entry of a list, whose values are paths;
 *   every string value is one when omitted
 * @param resolveKey - Whether the keys of a map are paths
 * @returns The property with its paths resolved, in the same shape, or `undefined` as given
 */
export async function relPathToNameOrAbsPath<
	T extends string | readonly (string | Record<string, unknown>)[] | Readonly<Record<string, unknown>> | undefined,
>(dir: string, filePath?: T, resolveProps?: readonly string[], resolveKey = false): Promise<T> {
	if (filePath == null) {
		// @ts-ignore
		return undefined;
	}
	if (typeof filePath === 'string') {
		// @ts-ignore
		return resolveNameOrAbsPath(dir, filePath);
	}
	if (Array.isArray(filePath)) {
		// @ts-ignore
		return Promise.all(filePath.map(fp => relPathToNameOrAbsPath(dir, fp, resolveProps)));
	}
	const res: Record<string, unknown> = {};
	for (const [key, fp] of Object.entries(filePath)) {
		let _key = key;
		if (resolveKey) {
			_key = await resolveNameOrAbsPath(dir, key);
		}
		if (typeof fp === 'string') {
			if (!resolveProps) {
				res[_key] = await resolveNameOrAbsPath(dir, fp);
			} else if (resolveProps.includes(key)) {
				res[_key] = await resolveNameOrAbsPath(dir, fp);
			} else {
				res[_key] = fp;
			}
		} else {
			res[_key] = fp;
		}
	}
	// @ts-ignore
	return res;
}
