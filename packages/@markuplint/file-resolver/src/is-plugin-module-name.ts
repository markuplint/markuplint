/**
 * Whether a name of `extends` has the form `plugin:<name>/<config>`. Nothing loads it; it is
 * recognized so that the name is kept as written (not resolved as a path) and reported, instead of
 * failing as a file that does not exist.
 *
 * Dropped in v7 with the error that reports the name (`removedPluginError()` of `config-provider.ts`):
 * a name of this form is then resolved like any other value of `extends`.
 *
 * @param name - The name given to `extends`
 * @returns `true` for the removed form
 */
export function isPluginModuleName(name: string) {
	return /^plugin:/i.test(name);
}
