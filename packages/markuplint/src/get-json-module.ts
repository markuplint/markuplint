import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Loads a JSON module by its path using `require`, returning `null` if the module cannot be found.
 *
 * This is a safe wrapper around `require` that swallows resolution errors,
 * making it suitable for optional module loading (e.g., locale files).
 *
 * @template T - The expected shape of the JSON module.
 * @param modulePath - The module specifier or file path to load.
 * @returns The parsed JSON module, or `null` if it could not be loaded.
 */
export function getJsonModule<T extends {}>(modulePath: string): T | null {
	try {
		return require(modulePath);
	} catch {
		return null;
	}
}
