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

function toPascalCase(str: string): string {
	if (str.includes('-')) {
		return str
			.split('-')
			.map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
			.join('');
	}
	return str.charAt(0).toUpperCase() + str.slice(1);
}
