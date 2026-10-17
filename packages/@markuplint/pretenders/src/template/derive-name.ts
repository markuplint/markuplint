import path from 'node:path';

/**
 * - `BaseButton.vue` → `BaseButton` (remove extension)
 * - `base-button.vue` → `BaseButton` (kebab-case → PascalCase)
 * - `Card/index.vue` → `Card` (parent directory name for index files)
 */
export function deriveName(filePath: string): string {
	const parsed = path.parse(filePath);
	const baseName = parsed.name;

	const nameToConvert = baseName === 'index' ? path.basename(parsed.dir) || 'index' : baseName;

	return toPascalCase(nameToConvert);
}

/**
 * A JavaScript identifier (https://tc39.es/ecma262/#prod-IdentifierName): what a tag
 * names a component by. A file name with `[`, `+`, `.`, or a digit at its start makes
 * none. ZWNJ and ZWJ, which an identifier may continue with, are `Join_Control`.
 * `RE_SIMPLE_COMPONENT_NAME` of `disambiguate` takes the same names, kebab-case added:
 * change the two together.
 */
const RE_COMPONENT_IDENTIFIER = /^[\p{ID_Start}$_][\p{ID_Continue}\p{Join_Control}$]*$/u;

/**
 * The name a component that has none of its own (a Vue/Svelte/Astro file, a JSX/TSX
 * default export without a name) is given: {@link deriveName}, when that is a
 * JavaScript identifier. A file name such as those of the routes of a framework
 * (`[id].vue`, `+page.svelte`, `404.tsx`, `posts.$id.tsx`) makes none: as a selector,
 * `[id]` would match every element with an `id` attribute, `Posts.$id` would be a tag
 * with a class, and the others are no selector of a tag at all.
 *
 * @param filePath - The path of the file
 * @returns The name, or `null` when the file name makes no component name
 */
export function componentNameOfFile(filePath: string): string | null {
	const name = deriveName(filePath);
	return RE_COMPONENT_IDENTIFIER.test(name) ? name : null;
}

function toPascalCase(str: string): string {
	if (str.includes('-')) {
		return str
			.split('-')
			.map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
			.join('');
	}
	return str.charAt(0).toUpperCase() + str.slice(1);
}
