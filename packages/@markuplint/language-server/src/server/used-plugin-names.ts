/**
 * The names of the plugins that the configuration set of an installed `markuplint` resolved.
 *
 * The language server loads the `markuplint` of the project it serves (`get-module.ts`), and a
 * project can have one before v6, whose configuration set has `plugins`. From v6 on the plugin
 * mechanism is gone, and so is the property of this package's own `ConfigSet` type: the property is
 * read as it comes, whatever the version.
 *
 * @param configSet - The configuration set that the loaded `markuplint` resolved
 * @returns The names, or `undefined` when the loaded version has no plugins to report
 */
export function usedPluginNames(configSet: object): readonly string[] | undefined {
	if (!('plugins' in configSet) || !Array.isArray(configSet.plugins)) {
		return undefined;
	}
	return configSet.plugins.flatMap((plugin: unknown) =>
		typeof plugin === 'object' && plugin !== null && 'name' in plugin && typeof plugin.name === 'string'
			? [plugin.name]
			: [],
	);
}
