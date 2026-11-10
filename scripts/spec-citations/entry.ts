import { existsSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * Whether a module was started as `node <this-file>`. `import.meta.url` is the real path of the module, while
 * `process.argv[1]` is the path as it was typed, so the entry file is resolved first: a script reached through a
 * symbolic link (a `node_modules/.bin` entry, a linked checkout) is still the entry. Comparing URLs through
 * `pathToFileURL` keeps it right on Windows.
 */
export function isCliEntry(importMetaUrl: string): boolean {
	const entry = process.argv[1];
	return entry !== undefined && existsSync(entry) && importMetaUrl === pathToFileURL(realpathSync(entry)).href;
}
