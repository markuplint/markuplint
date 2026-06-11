import type { Langs } from './types.js';

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
