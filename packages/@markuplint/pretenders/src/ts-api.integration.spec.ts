import path from 'node:path';

import { ScriptKind } from 'typescript/ast';
import { ModuleResolver } from 'typescript/sync';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { parseImports } from './import-resolver/parse-imports.js';
import { normalizePath, resolveModuleFile } from './import-resolver/resolve-module-file.js';
import { clearPretenderCaches } from './index.js';
import { closeTsApi, peekTsApi, TsApiError, tsApi } from './ts-api.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures', 'module-resolution');

/**
 * Makes the method of an API object throw. The methods are accessors that return the function, which
 * `spyOn` takes for a property of a plain object.
 */
function failWith(target: object, key: string) {
	const fail = Object.assign(
		() => {
			throw new Error('the process died');
		},
		{
			gen: () => {
				throw new Error('the process died');
			},
		},
	);
	vi.spyOn(target as Record<string, string>, key, 'get').mockReturnValue(fail as never);
}

afterEach(() => {
	vi.restoreAllMocks();
	closeTsApi();
});

describe('clearPretenderCaches when the compiler process has died', () => {
	const importer = path.resolve(fixtureDir, 'relative', 'importer.tsx');
	const resolved = normalizePath(path.resolve(fixtureDir, 'relative', 'a.tsx'));

	test('stops the compiler and empties the resolvers even when one cannot be released, and then resolves again', () => {
		expect(resolveModuleFile(importer, './a')).toBe(resolved);
		failWith(ModuleResolver.prototype, 'dispose');

		expect(() => {
			clearPretenderCaches();
		}).toThrow(TsApiError);
		expect(peekTsApi()).toBeNull();

		vi.restoreAllMocks();
		expect(resolveModuleFile(importer, './a')).toBe(resolved);
	});
});

describe('parseImports when the compiler process has died', () => {
	// The lexer rejects the JSX, so the TypeScript parser reads the source.
	const source = "const r = () => <>{a.map(i => <b />)}</>\nimport Item from './Item.vue'";

	test('raises the failure of the compiler, not a source with no bindings', async () => {
		failWith(tsApi(), 'transpileModule');

		await expect(parseImports(source, ScriptKind.TSX)).rejects.toThrow(TsApiError);
	});
});
