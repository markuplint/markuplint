import { minimatch } from 'minimatch';

/**
 * Coarse grouping of validator-test paths used by `summary.md` and the
 * generated `nu-validator.spec.ts`. `uncategorized` catches the tails
 * (html-rdfa, html-svg, langdetect, …) that do not fit the nine named
 * buckets.
 */
export type CategoryId =
	| 'content-model'
	| 'deprecated'
	| 'require-attr'
	| 'invalid-attr'
	| 'global-attr'
	| 'no-duplicate-id'
	| 'aria'
	| 'assertions'
	| 'data-types'
	| 'uncategorized';

/**
 * Declarative routing rule for one category. `include` and `exclude` are
 * minimatch globs relative to `validator/tests/`.
 */
export type Category = {
	readonly id: Exclude<CategoryId, 'uncategorized'>;
	readonly label: string;
	readonly include: readonly string[];
	readonly exclude?: readonly string[];
};

/**
 * Ordered list of category rules. The first match wins, so more specific
 * categories (e.g. `content-model` with explicit `model-*` globs) must come
 * before broader ones (e.g. `invalid-attr` that otherwise swallows the whole
 * `html/elements/**` subtree).
 */
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
		id: 'require-attr',
		label: 'Required Attributes',
		include: ['html/assertions/**/*missing*.html'],
	},
	{
		id: 'no-duplicate-id',
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

/**
 * Find the `CategoryId` for a validator-test path.
 *
 * @param path Path relative to `validator/tests/` (POSIX separators).
 * @returns The first matching category id, or `'uncategorized'` if no rule
 *   accepts the path.
 */
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

/**
 * Keep only the paths that belong to `id`. Useful for narrowing a bench run
 * to one category interactively.
 *
 * @param paths Candidate paths, relative to `validator/tests/`.
 * @param id Category to keep.
 * @returns Matching subset, in the original order.
 */
export function filterByCategory(paths: readonly string[], id: Exclude<CategoryId, 'uncategorized'>): string[] {
	return paths.filter(path => inferCategory(path) === id);
}
