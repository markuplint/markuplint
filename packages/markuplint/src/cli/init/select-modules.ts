import type { Langs } from './types.js';

/**
 * Determines the list of npm modules that need to be installed based on the
 * user's template language selections.
 *
 * Always includes `markuplint` itself, adds a parser package for each selected
 * language, and includes spec packages for Vue and React when applicable.
 *
 * @param selectedLangs - The template languages/frameworks selected by the user.
 * @returns An array of npm package names to install.
 */
export function selectModules(selectedLangs: readonly Langs[]) {
	const modules = ['markuplint', ...selectedLangs.map(lang => `@markuplint/${lang}-parser`)];

	if (selectedLangs.includes('vue')) {
		modules.push('@markuplint/vue-spec');
	}
	if (selectedLangs.includes('jsx')) {
		modules.push('@markuplint/react-spec');
	}

	return modules;
}
