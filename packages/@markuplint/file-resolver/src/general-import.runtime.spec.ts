import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, expect, test } from 'vitest';

const require = createRequire(import.meta.url);

const libDir = path.resolve(import.meta.dirname, '..', 'lib');

/**
 * Calls `fn` of this package's built `lib/<module>.js` (`yarn build` first: `lib/` is what the
 * runtimes load) with `specifier` in a fresh process of the runtime that runs the specs, and
 * returns what it resolves to, with the debug log of the package as the message of the
 * assertion: `generalImport()` answers every failure with `null` and names the reason there
 * alone. Vitest transforms the `import()` of a module the specs load, and takes a JSON module
 * without an import attribute, which Node.js and Deno do not, so what the packages meet is
 * observed there rather than faked.
 */
function callInRuntime(module: 'general-import' | 'module-exists', fn: string, specifier: string) {
	const lib = pathToFileURL(path.resolve(libDir, `${module}.js`)).href;
	const code = `import(${JSON.stringify(lib)}).then(m => m.${fn}(${JSON.stringify(specifier)})).then(result => console.log(JSON.stringify({ result: result ?? null })))`;
	const args = 'Deno' in globalThis ? ['eval', code] : ['-e', code];
	const { stdout, stderr, status } = spawnSync(process.execPath, args, {
		encoding: 'utf8',
		cwd: import.meta.dirname,
		env: { ...process.env, DEBUG: 'ml-fr:*', DEBUG_COLORS: '0' },
	});
	const log = `exit ${status}\n${stderr}`;
	const result = (JSON.parse(stdout.trim().split('\n').at(-1) || '{}') as { result?: unknown }).result ?? null;
	return { result, log };
}

// A `lib/` of an older build lacks the module the two under test import, and the child process
// would report that in its stderr alone.
test('precondition: this package is built', () => {
	expect(existsSync(path.resolve(libDir, 'import-module.js'))).toBe(true);
});

describe('a JSON file of a package without an exports map, as `extends: ["<package>/<file>.json"]` names it', () => {
	const specifier = '@markuplint-test/react-pkg-pretenders/package.json';

	// Without an `exports` map, nothing turns the specifier into a path first: it reaches the
	// runtime's `import()` as it is, which refuses a JSON module without an import attribute.
	test('precondition: the package has no exports map', () => {
		expect(require(specifier)).not.toHaveProperty('exports');
	});

	test('generalImport() imports it', () => {
		const { result, log } = callInRuntime('general-import', 'generalImport', specifier);
		expect(result, log).toMatchObject({ name: '@markuplint-test/react-pkg-pretenders' });
	});

	test('moduleExists() takes it for a module', () => {
		const { result, log } = callInRuntime('module-exists', 'moduleExists', specifier);
		expect(result, log).toBe(true);
	});
});

describe('a JSON file by its absolute path, which a subpath that an exports map does not expose becomes', () => {
	test('generalImport() imports it', () => {
		const file = path.resolve(import.meta.dirname, '..', 'package.json');
		const { result, log } = callInRuntime('general-import', 'generalImport', file);
		expect(result, log).toMatchObject({ name: '@markuplint/file-resolver' });
	});
});

describe('a specifier that the exports map of a package redirects', () => {
	// `@markuplint-test/react` maps `./preset` to a JSON file and `./config.json` to a JavaScript
	// module, so neither the extension of the specifier nor that of the file decides alone. Its
	// `package.json` is read by path, as the exports map does not expose it.
	test('precondition: the package maps both', () => {
		const packageJson = path.resolve(import.meta.dirname, '../../../@markuplint-test/react/package.json');
		expect(require(packageJson).exports).toMatchObject({
			'./preset': './pretenders.json',
			'./config.json': './config.js',
		});
	});

	test('generalImport() imports the JSON file that a specifier without the extension reaches', () => {
		const { result, log } = callInRuntime('general-import', 'generalImport', '@markuplint-test/react/preset');
		expect(result, log).toMatchObject({ data: [{ selector: 'Sample', as: 'div', filePath: 'sample.jsx:1:16' }] });
	});

	test('moduleExists() takes the JSON file that a specifier without the extension reaches for a module', () => {
		const { result, log } = callInRuntime('module-exists', 'moduleExists', '@markuplint-test/react/preset');
		expect(result, log).toBe(true);
	});

	test('generalImport() imports the JavaScript module that a `.json` specifier reaches', () => {
		const { result, log } = callInRuntime('general-import', 'generalImport', '@markuplint-test/react/config.json');
		expect(result, log).toStrictEqual({ redirected: true });
	});
});
