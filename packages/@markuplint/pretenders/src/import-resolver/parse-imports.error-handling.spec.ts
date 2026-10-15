import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * `es-module-lexer` is replaced because neither failure mode can be produced with the real
 * module: its WASM initialization does not fail on demand, and a `TypeError` from `parse()`
 * only occurs on an internal bug.
 */
const lexer = vi.hoisted(() => ({
	init: vi.fn<() => Promise<void>>(),
	parse: vi.fn<(source: string) => readonly [readonly unknown[], readonly unknown[]]>(),
}));

vi.mock('es-module-lexer', () => lexer);

/** Loads a fresh module instance so the module-level init promise does not leak between tests. */
async function loadParseImports() {
	vi.resetModules();
	const { parseImports } = await import('./parse-imports.js');
	return parseImports;
}

describe('parseImports error handling', () => {
	beforeEach(() => {
		lexer.init.mockReset();
		lexer.parse.mockReset();
		lexer.init.mockResolvedValue();
		lexer.parse.mockReturnValue([[], []]);
	});

	describe('initialization failure', () => {
		test('a rejected initialization is not cached, so the next call retries', async () => {
			lexer.init.mockRejectedValueOnce(new Error('wasm unavailable'));
			const parseImports = await loadParseImports();

			await expect(parseImports("import A from './a'")).rejects.toThrow('wasm unavailable');
			await expect(parseImports("import A from './a'")).resolves.toStrictEqual([]);
			expect(lexer.init).toHaveBeenCalledTimes(2);
		});

		test('concurrent calls during a failing initialization all reject, then a later call recovers', async () => {
			lexer.init.mockRejectedValueOnce(new Error('wasm unavailable'));
			const parseImports = await loadParseImports();

			const results = await Promise.allSettled([parseImports(''), parseImports('')]);
			expect(results.map(r => r.status)).toStrictEqual(['rejected', 'rejected']);
			expect(lexer.init).toHaveBeenCalledTimes(1);

			await expect(parseImports('')).resolves.toStrictEqual([]);
			expect(lexer.init).toHaveBeenCalledTimes(2);
		});

		test('a successful initialization is reused', async () => {
			const parseImports = await loadParseImports();

			await parseImports('');
			await parseImports('');
			expect(lexer.init).toHaveBeenCalledTimes(1);
		});
	});

	describe('parse failure', () => {
		test('a lexer parse error on non-JS content returns empty bindings', async () => {
			lexer.parse.mockImplementation(() => {
				throw Object.assign(new Error('Parse error @:1:3'), { idx: 2 });
			});
			const parseImports = await loadParseImports();

			await expect(parseImports('# Hello')).resolves.toStrictEqual([]);
		});

		test.each([
			['TypeError', new TypeError('broken invariant')],
			['ReferenceError', new ReferenceError('broken invariant')],
			['RangeError', new RangeError('broken invariant')],
			['non-Error throw', 'broken invariant'],
		])('a fatal error (%s) is rethrown instead of being swallowed', async (_name, thrown) => {
			lexer.parse.mockImplementation(() => {
				// eslint-disable-next-line @typescript-eslint/only-throw-error
				throw thrown;
			});
			const parseImports = await loadParseImports();

			await expect(parseImports("import A from './a'")).rejects.toBe(thrown);
		});
	});
});
