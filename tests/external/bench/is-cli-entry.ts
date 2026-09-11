import { pathToFileURL } from 'node:url';

/**
 * Detect whether the current module was launched as `node <this-file>`.
 *
 * Comparing `import.meta.url` with `file://${process.argv[1]}` breaks on
 * Windows (`file:///C:/...` vs `file://C:\...`). Use `pathToFileURL` to get
 * a canonical form that works on every platform.
 */
export function isCliEntry(importMetaUrl: string): boolean {
	const entry = process.argv[1];
	if (!entry) return false;
	return importMetaUrl === pathToFileURL(entry).href;
}
