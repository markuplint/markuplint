// @ts-nocheck

import { selectModules } from './install-module';

test('selectModules', () => {
	expect(selectModules(['jsx'])).toStrictEqual(['markuplint', '@markuplint/jsx-parser', '@markuplint/react-spec']);

	expect(selectModules(['jsx', 'vue', 'svelte'])).toStrictEqual([
		'markuplint',
		'@markuplint/jsx-parser',
		'@markuplint/vue-parser',
		'@markuplint/svelte-parser',
		'@markuplint/vue-spec',
		'@markuplint/react-spec',
	]);

	expect(selectModules(['astro'])).toStrictEqual(['markuplint', '@markuplint/astro-parser']);
});
