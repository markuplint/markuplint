import { isModuleNotFoundError } from '@markuplint/shared';

/**
 * `import()` that takes a JSON module as one. Node.js and Deno load a JSON module only with the
 * import attribute `type: 'json'` (Bun takes it either way), and a module that a configuration
 * names can be one, a configuration to `extends` or the data of `pretenders`, with or without the
 * `.json` extension, as the `exports` map of a package can redirect a specifier. The attribute
 * cannot be given up front: a `.json` specifier can be redirected to a JavaScript module the same
 * way, and the attribute would then be rejected. So the specifier is imported as it is, and when
 * that fails for any reason but the module being absent, once more with the attribute. A success
 * of the retry is a JSON module on every runtime, without reading the code or the message by which
 * each runtime reports the missing attribute.
 *
 * When the retry fails too, the error of the attempt that tells more is thrown: the retry's when
 * the module is JSON, which Node.js said with `ERR_IMPORT_ATTRIBUTE_MISSING` or the `.json`
 * extension says (a syntax error in the file, say), and the first attempt's otherwise (a package
 * that is not installed, a subpath that `exports` does not expose), as that is what the callers
 * read.
 *
 * The `catch` is not guarded by `isFatalError()`: Node.js reports the missing attribute with a
 * `TypeError`, which the guard would re-throw before the retry.
 *
 * @param specifier - What `import()` takes: a bare specifier, a `file:` URL, or an absolute path
 *   as `moduleExists()` passes it (a Windows drive path fails here and is left to its
 *   `require.resolve()`)
 * @returns The module namespace that `import()` resolves to
 */
export async function importModule(specifier: string): Promise<Record<string, unknown>> {
	try {
		return await import(specifier);
	} catch (error) {
		if (isModuleNotFoundError(error)) {
			throw error;
		}
		try {
			return await import(specifier, { with: { type: 'json' } });
		} catch (retryError) {
			throw isImportAttributeMissing(error) || specifier.endsWith('.json') ? retryError : error;
		}
	}
}

/**
 * @param error - What `import()` threw
 * @returns `true` for Node.js's report that the module is JSON and the attribute was not given
 */
function isImportAttributeMissing(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ERR_IMPORT_ATTRIBUTE_MISSING';
}
