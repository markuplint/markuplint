import { execFileSync } from 'node:child_process';

import { describe, expect, test } from 'vitest';

import { isModuleNotFoundError, missingPackageOf } from './module-not-found.js';

/**
 * What a runtime raises for an `import()` of a package that is not installed. The wording is the runtime's
 * (Node, Bun and Deno each have their own) and `missingPackageOf` reads it, so it is observed in a fresh
 * process of the runtime that runs the specs rather than faked. Vitest transforms the `import()` of a spec
 * and raises its own error, which is not what the code of the packages meets.
 */
function importInRuntime(specifier: string): Error {
	const code = `import(${JSON.stringify(specifier)}).then(() => {}, e => console.log(JSON.stringify({ code: e.code, message: e.message })))`;
	const args = 'Deno' in globalThis ? ['eval', code] : ['-e', code];
	const output = execFileSync(process.execPath, args, { encoding: 'utf8', cwd: import.meta.dirname });
	const { code: errorCode, message } = JSON.parse(output.trim().split('\n').at(-1) ?? '{}') as {
		code?: string;
		message?: string;
	};
	return Object.assign(new Error(message), { code: errorCode });
}

describe('what the runtime raises for a package that is not installed', () => {
	test('is an ERR_MODULE_NOT_FOUND', () => {
		expect(isModuleNotFoundError(importInRuntime('@markuplint/not-installed-package'))).toBe(true);
	});

	test.each(['@markuplint/not-installed-package', 'not-installed-package'])('%s is the package named', name => {
		expect(missingPackageOf(importInRuntime(name))).toBe(name);
	});

	test('names the package, not the subpath, for a subpath of it', () => {
		expect(missingPackageOf(importInRuntime('@markuplint/not-installed-package/component-scanner'))).toBe(
			'@markuplint/not-installed-package',
		);
	});
});
