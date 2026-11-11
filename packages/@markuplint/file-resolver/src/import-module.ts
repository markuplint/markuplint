import { createRequire } from 'node:module';

import { isModuleNotFoundError } from '@markuplint/shared';

import { log } from './debug.js';
import { fromFileURL } from './path-utils.js';

const require = createRequire(import.meta.url);

const iLog = log.extend('import-module');

/**
 * `import()` that takes a JSON module as one. Node.js and Deno load a JSON module through
 * `import()` only with the import attribute `type: 'json'` (Bun takes it either way), and a
 * module that a configuration names can be one, a configuration to `extends` or the data of
 * `pretenders`, with or without the `.json` extension, as the `exports` map of a package can
 * redirect a specifier. The attribute cannot be given up front, as a `.json` specifier can be
 * redirected to a JavaScript module the same way, and the attribute would then be rejected; and
 * Deno rejects a dynamic `import()` with the attribute as it rejects one without. So the
 * specifier is imported as it is, and when the runtime reports a JSON module without the
 * attribute ({@link isJsonWithoutAttribute}), or the `.json` extension says so, it is
 * `require()`d instead: CommonJS takes a JSON module as it is on every runtime, a bare specifier
 * and a path alike, and what it returns is handed over as the default export, the shape
 * `import()` gives a JSON module. Any other failure of `import()` is thrown as it is, as that is
 * what the callers read (a package that is not installed, a subpath that `exports` does not
 * expose), and `require()` would only run the module's code again. The report is read before the
 * code of a missing module, as Deno attaches that code to the report as well; the code decides
 * only for a `.json` specifier that the runtime did not report as JSON.
 *
 * The `catch` is not guarded by `isFatalError()`: the runtimes report the missing attribute with
 * a `TypeError`, which the guard would re-throw before the retry.
 *
 * @param specifier - What `import()` takes: a bare specifier, a `file:` URL, or an absolute path
 *   as `moduleExists()` passes it (a Windows drive path fails here and is left to its
 *   `require.resolve()`)
 * @returns The module namespace that `import()` resolves to, or `{ default }` of what
 *   `require()` returns for a JSON module
 */
export async function importModule(specifier: string): Promise<Record<string, unknown>> {
	try {
		return await import(specifier);
	} catch (error) {
		const isJson = isJsonWithoutAttribute(error) || (specifier.endsWith('.json') && !isModuleNotFoundError(error));
		if (!isJson) {
			throw error;
		}
		iLog('`import()` refused %s as a JSON module (%O); taking `require()`', specifier, error);
		return { default: require(specifier.startsWith('file:') ? fromFileURL(specifier) : specifier) };
	}
}

/**
 * Whether `import()` reported that the module is JSON and the attribute was not given. The
 * wording is each runtime's own, observed in `general-import.runtime.spec.ts` in a fresh process
 * of the runtime that runs the specs:
 *
 * - Node.js: the code `ERR_IMPORT_ATTRIBUTE_MISSING`
 * - Deno: `Attempted to load JSON module without specifying "type": "json" attribute in the
 *   import statement.`
 * - Bun: never, as it takes a JSON module without the attribute
 *
 * @param error - What `import()` threw
 * @returns `true` for that report
 */
function isJsonWithoutAttribute(error: unknown): boolean {
	return (
		error instanceof Error &&
		(('code' in error && error.code === 'ERR_IMPORT_ATTRIBUTE_MISSING') ||
			error.message.startsWith('Attempted to load JSON module without specifying "type": "json" attribute'))
	);
}
