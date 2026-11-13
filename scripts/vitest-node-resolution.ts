import type { Plugin } from 'vite';

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

const NOT_FOUND = '\0node-module-not-found:';

/**
 * The package that Node.js names in the message: `@scope/name` or `name`, without the subpath.
 * `packageNameOf()` in `@markuplint/shared` reads the same rule back from the message; it is not
 * imported, as a vitest config is loaded before the packages are built (`website.yml` runs a spec
 * without a build). The spec of this file checks that the two agree.
 *
 * @param specifier A bare specifier
 * @returns Its package name
 */
function packageName(specifier: string) {
	return specifier
		.split('/')
		.slice(0, specifier.startsWith('@') ? 2 : 1)
		.join('/');
}

/**
 * Makes a bare specifier that names a file under Vite's root, not a package,
 * fail to import in a spec as it fails in Node.js.
 *
 * When Vite cannot resolve the specifier of a dynamic `import()`, vitest 5
 * takes it as a URL of its dev server, which is relative to the root (the
 * branch commented "handle unresolved id of dynamic import skipped by Vite
 * import analysis" in the module fetch of vitest 5.1.0): an
 * `import('packages/markuplint/test/config.json')` then loads that file. Node.js
 * resolves a bare specifier from `node_modules` only and throws
 * `ERR_MODULE_NOT_FOUND`. `@markuplint/file-resolver` tells a module name from
 * a path relative to the working directory by trying `import()`, so under the
 * vitest behavior a relative path without `./` is taken for a module name, and
 * a spec passes or fails on what no user can meet.
 *
 * Only a specifier that no other plugin resolves and that names a file under
 * the root is refused. Vite calls a `post` plugin only after every other one
 * has returned nothing, so the hook does not resolve again. A specifier that
 * names no file, a directory included, is left to vitest, as `vi.mock()` of a
 * package that is not installed relies on it. The error mirrors the one Node.js
 * throws, code and message; it is thrown when the module is evaluated, as
 * vitest rethrows an error of the `load` hook without its `code`, which
 * `isModuleNotFoundError()` of `@markuplint/shared` reads.
 *
 * Every `vitest*.config.ts` at the repository root loads the plugin, which the
 * spec next to this file asserts. The plugin can go once its spec passes
 * without it.
 *
 * @returns The plugin, for `plugins` of a vitest config
 */
export function nodeBareSpecifierResolution(): Plugin {
	let root = process.cwd();
	return {
		name: 'markuplint:node-bare-specifier-resolution',
		enforce: 'post',
		configResolved(config) {
			root = config.root;
		},
		resolveId(id, importer) {
			if (
				id.startsWith('\0') ||
				id.startsWith('./') ||
				id.startsWith('../') ||
				id.startsWith('/') ||
				/^[a-z][\d+.a-z-]*:/i.test(id)
			) {
				return null;
			}
			// `existsSync()` first: it returns `false` for any error, such as a name too long or one
			// that Windows does not allow, where `statSync()` throws.
			const file = path.resolve(root, id);
			if (!existsSync(file) || !statSync(file).isFile()) {
				return null;
			}
			return NOT_FOUND + JSON.stringify([id, path.normalize(importer ?? root)]);
		},
		load(id) {
			if (!id.startsWith(NOT_FOUND)) {
				return null;
			}
			const [specifier, importer] = JSON.parse(id.slice(NOT_FOUND.length)) as [string, string];
			const message = JSON.stringify(`Cannot find package '${packageName(specifier)}' imported from ${importer}`);
			return `throw Object.assign(new Error(${message}), { code: 'ERR_MODULE_NOT_FOUND' });`;
		},
	};
}
