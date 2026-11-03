/**
 * Whether an error is the `ERR_MODULE_NOT_FOUND` that Node raises for an `import()` that finds
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
 * The package that an `ERR_MODULE_NOT_FOUND` of Node names as missing: `Cannot find package '<name>'
 * imported from <path>`. The path is that of the module that imports it, which is inside the
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
	return /^Cannot find package '([^']+)'/.exec(error.message)?.[1];
}
