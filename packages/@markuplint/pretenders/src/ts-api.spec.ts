import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';

import {
	callTsApi,
	clearTsSourceFileCache,
	closeTsApi,
	hasSyntaxError,
	onTsApiClose,
	parseSource,
	peekTsApi,
	TsApiError,
	tsApi,
	withVirtualSources,
} from './ts-api.js';

afterAll(() => {
	closeTsApi();
});

describe('parseSource', () => {
	test('parses a source text into a source file whose nodes can be read', () => {
		const sourceFile = parseSource('a.ts', 'const a = 1;');
		expect(sourceFile.statements).toHaveLength(1);
		expect(sourceFile.statements[0]?.getText(sourceFile)).toBe('const a = 1;');
	});

	test('keeps the nodes of earlier sources readable after later ones are parsed', () => {
		const first = parseSource('first.ts', 'export const first = 1;');
		parseSource('second.ts', 'export const second = 2;');
		parseSource('third.ts', 'export const third = 3;');
		expect(first.statements[0]?.getText(first)).toBe('export const first = 1;');
	});

	test('keeps the parent, the start and the JSDoc of a node readable once the lease is released', () => {
		const sourceFile = parseSource('a.ts', '/** the doc */\nexport function f() {}');
		const [statement] = sourceFile.statements;
		expect(statement?.parent).toBe(sourceFile);
		expect(statement?.getStart(sourceFile)).toBe(sourceFile.text.indexOf('export'));
		expect(statement?.jsDoc).toHaveLength(1);
	});
});

describe('hasSyntaxError', () => {
	test('reports no syntax error for a valid source', () => {
		expect(hasSyntaxError('a.ts', 'export const a: number = 1;')).toBe(false);
	});

	test('reports a syntax error for a broken source', () => {
		expect(hasSyntaxError('a.ts', 'const = ;')).toBe(true);
	});

	test('reads JSX by the extension of the file name', () => {
		expect(hasSyntaxError('a.tsx', 'const a = <div />;')).toBe(false);
		expect(hasSyntaxError('a.ts', 'const a = <div />;')).toBe(true);
	});

	test('reads JavaScript of a .js file, where TypeScript syntax is an error', () => {
		expect(hasSyntaxError('a.js', 'const a = 1;')).toBe(false);
		expect(hasSyntaxError('a.js', 'const a: number = 1;')).toBe(true);
	});

	test('reports no syntax error for JSX of a .jsx file', () => {
		expect(hasSyntaxError('a.jsx', 'const a = <div />;')).toBe(false);
	});

	test('reports no syntax error for imports of every form', () => {
		expect(hasSyntaxError('script.ts', "import a, { b } from './x'; import * as c from './y';")).toBe(false);
	});
});

describe('withVirtualSources', () => {
	test('restores the previous sources when the callback returns', () => {
		const outer = new Map([['/virtual/outer.ts', 'outer']]);
		const inner = new Map([['/virtual/inner.ts', 'inner']]);
		const seen: string[] = [];
		withVirtualSources(outer, () => {
			withVirtualSources(inner, () => {
				seen.push('inner');
			});
			seen.push('outer');
		});
		expect(seen).toStrictEqual(['inner', 'outer']);
	});

	test('restores the previous sources when the callback throws', () => {
		expect(() =>
			withVirtualSources(new Map(), () => {
				throw new Error('boom');
			}),
		).toThrow('boom');
		// A source of a program is not found once the sources are gone, but a later call still works.
		expect(parseSource('a.ts', 'const a = 1;').statements).toHaveLength(1);
	});

	test('returns what the callback returns', () => {
		expect(withVirtualSources(undefined, () => 42)).toBe(42);
	});
});

describe('clearTsSourceFileCache', () => {
	test('does nothing without a running API, and keeps a running one usable', () => {
		closeTsApi();
		expect(() => {
			clearTsSourceFileCache();
		}).not.toThrow();
		expect(peekTsApi()).toBeNull();

		parseSource('a.ts', 'const a = 1;');
		clearTsSourceFileCache();
		expect(parseSource('b.ts', 'const b = 2;').statements).toHaveLength(1);
	});
});

describe('the lifecycle of the API', () => {
	afterEach(() => {
		closeTsApi();
	});

	test('reuses one API instance until it is closed', () => {
		const first = tsApi();
		expect(tsApi()).toBe(first);
		expect(peekTsApi()).toBe(first);
		closeTsApi();
		expect(peekTsApi()).toBeNull();
		expect(tsApi()).not.toBe(first);
	});

	test('parses again after it is closed', () => {
		parseSource('a.ts', 'const a = 1;');
		closeTsApi();
		const sourceFile = parseSource('b.ts', 'const b = 2;');
		expect(sourceFile.statements[0]?.getText(sourceFile)).toBe('const b = 2;');
	});

	test('closing without an instance does nothing', () => {
		expect(() => {
			closeTsApi();
			closeTsApi();
		}).not.toThrow();
	});

	test('tells the listeners when a running instance is closed, and not when there is none', () => {
		const listener = vi.fn();
		onTsApiClose(listener);
		closeTsApi();
		expect(listener).not.toHaveBeenCalled();

		tsApi();
		closeTsApi();
		expect(listener).toHaveBeenCalledTimes(1);
	});
});

describe('a failure of the compiler process', () => {
	afterEach(() => {
		vi.restoreAllMocks();
		closeTsApi();
	});

	function breakApi() {
		// `createSourceFile` is a getter that returns the function; typed as a plain property so that `spyOn` takes it.
		vi.spyOn(tsApi() as unknown as { createSourceFile: string }, 'createSourceFile', 'get').mockReturnValue(
			Object.assign(
				() => {
					throw new Error('spawn failed');
				},
				{
					gen: () => {
						throw new Error('spawn failed');
					},
				},
			) as never,
		);
	}

	test('is a TsApiError that names the cause and the platform package', () => {
		breakApi();
		expect(() => parseSource('a.ts', 'const a = 1;')).toThrow(TsApiError);
		breakApi();
		expect(() => parseSource('a.ts', 'const a = 1;')).toThrow(/spawn failed.*@typescript\/typescript-<platform>/s);
	});

	test('drops the instance, so that the next call starts a new process and works', () => {
		breakApi();
		const broken = peekTsApi();
		expect(() => parseSource('a.ts', 'const a = 1;')).toThrow(TsApiError);
		expect(peekTsApi()).toBeNull();

		vi.restoreAllMocks();
		expect(parseSource('b.ts', 'const b = 2;').statements).toHaveLength(1);
		expect(peekTsApi()).not.toBe(broken);
	});

	test('is not wrapped twice', () => {
		const error = new TsApiError(new Error('first'));
		expect(() =>
			callTsApi(() => {
				throw error;
			}),
		).toThrow(error);
	});

	test('does not take an error of markuplint itself for a failure of the process', () => {
		const bug = new TypeError('a bug of ours');
		expect(() =>
			callTsApi(() => {
				throw bug;
			}),
		).toThrow(bug);
		expect(peekTsApi()).not.toBeNull();
	});
});
