import { minimatch } from 'minimatch';

export type CategoryId =
	| 'content-model'
	| 'deprecated'
	| 'required-attr'
	| 'invalid-attr'
	| 'global-attr'
	| 'id-duplication'
	| 'aria'
	| 'assertions'
	| 'data-types'
	| 'uncategorized';

export type Category = {
	readonly id: Exclude<CategoryId, 'uncategorized'>;
	readonly label: string;
	readonly include: readonly string[];
	readonly exclude?: readonly string[];
};

export const categories: readonly Category[] = [
	{
		id: 'content-model',
		label: 'Content Model',
		include: ['html/elements/model-*.html', 'html/elements/**/model-*.html'],
	},
	{
		id: 'deprecated',
		label: 'Deprecated Elements',
		include: ['html/obsolete/**/*.html'],
	},
	{
		id: 'required-attr',
		label: 'Required Attributes',
		include: ['html/assertions/**/*missing*.html'],
	},
	{
		id: 'id-duplication',
		label: 'ID Duplication',
		include: ['html/assertions/**/*duplicate-id*.html'],
	},
	{
		id: 'assertions',
		label: 'Assertions',
		include: ['html/assertions/**/*.html'],
		exclude: ['html/assertions/**/*missing*.html', 'html/assertions/**/*duplicate-id*.html'],
	},
	{
		id: 'global-attr',
		label: 'Global Attributes',
		include: ['html/attributes/**/*.html'],
	},
	{
		id: 'data-types',
		label: 'Data Types',
		include: ['html/datatypes/**/*.html'],
	},
	{
		id: 'aria',
		label: 'ARIA',
		include: ['html-aria/**/*.html'],
	},
	{
		id: 'invalid-attr',
		label: 'Invalid Attributes',
		include: ['html/elements/**/*.html'],
		exclude: ['html/elements/model-*.html', 'html/elements/**/model-*.html'],
	},
];

function matchesAny(path: string, patterns: readonly string[]): boolean {
	return patterns.some(pattern => minimatch(path, pattern));
}

export function inferCategory(path: string): CategoryId {
	for (const cat of categories) {
		if (cat.exclude && matchesAny(path, cat.exclude)) {
			continue;
		}
		if (matchesAny(path, cat.include)) {
			return cat.id;
		}
	}
	return 'uncategorized';
}

export function filterByCategory(paths: readonly string[], id: Exclude<CategoryId, 'uncategorized'>): string[] {
	return paths.filter(path => inferCategory(path) === id);
}
