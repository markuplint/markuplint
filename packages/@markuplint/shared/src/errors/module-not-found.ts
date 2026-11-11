/**
 * Whether an error is the `ERR_MODULE_NOT_FOUND` that a runtime raises for an `import()` that finds
 * no package or no file.
 *
 * It says nothing of which module is missing, and a missing dependency of an installed package
 * raises it as well: use {@link missingPackageOf} to tell the two apart.
 *
 * @param error - The caught value of the `import()`
 * @returns `true` for an `Error` with that code
 */
export function isModuleNotFoundError(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND';
}

/**
 * How a runtime words the `ERR_MODULE_NOT_FOUND` of a package, with what it names in the first group.
 * The wording is the runtime's, so each is observed in the spec that imports a package that does not
 * exist in a fresh process of the runtime.
 *
 * - Node and Bun: `Cannot find package '<name>' imported from <path>` (Bun: `... from '<path>'`)
 * - Deno: `Import "<specifier>" not a dependency`, which names the specifier as it was written, a
 *   subpath of the package included
 */
const MISSING_PACKAGE_MESSAGES: readonly RegExp[] = [
	/^Cannot find package '([^']+)'/,
	/^Import "([^"]+)" not a dependency/,
];

/**
 * The package of a specifier: `@scope/name` or `name`, without the subpath.
 *
 * @param specifier - A bare specifier, such as `@markuplint/vue-parser/component-scanner`
 * @returns The name of the package
 */
function packageNameOf(specifier: string): string {
	const segments = specifier.split('/');
	return (specifier.startsWith('@') ? segments.slice(0, 2) : segments.slice(0, 1)).join('/');
}

/**
 * The package that an `ERR_MODULE_NOT_FOUND` names as missing (see the wording of each runtime in
 * `MISSING_PACKAGE_MESSAGES`). The path is that of the module that imports it, which is inside the
 * package that was asked for when one of its own dependencies is missing, so the message as a whole
 * names the requested package either way, and only the name tells the two apart.
 *
 * Optional peers of markuplint (`@markuplint/pretenders`, the parsers it loads) are loaded dynamically
 * and left to the caller to do without when they are not installed; a caller compares the name with
 * the package it asked for, so that a missing dependency of an installed one stays a fault.
 *
 * @param error - The caught value of the `import()`
 * @returns The name of the missing package, or `undefined` for another error or another message
 *   (a missing file of a package)
 */
export function missingPackageOf(error: unknown): string | undefined {
	if (!(error instanceof Error) || !isModuleNotFoundError(error)) {
		return undefined;
	}
	for (const pattern of MISSING_PACKAGE_MESSAGES) {
		const specifier = pattern.exec(error.message)?.[1];
		if (specifier) {
			return packageNameOf(specifier);
		}
	}
	return undefined;
}
