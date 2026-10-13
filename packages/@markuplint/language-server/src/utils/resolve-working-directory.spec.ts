import path from 'node:path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { resolveWorkingDirectory, convertGlobToRegex } from './resolve-working-directory.js';
import type { WorkingDirectoryEntry } from './resolve-working-directory.js';

// Mock fs.existsSync for auto/location mode tests
vi.mock('node:fs', () => ({
	default: {
		existsSync: vi.fn(() => false),
	},
}));

// Import fs after mocking so we can set up return values
const fs = await import('node:fs');
const existsSyncMock = vi.mocked(fs.default.existsSync);

describe('convertGlobToRegex', () => {
	it('converts a simple wildcard pattern', () => {
		const regex = convertGlobToRegex('./packages/*/');
		expect(regex.test('./packages/foo/')).toBe(true);
		expect(regex.test('./packages/bar/')).toBe(true);
		expect(regex.test('./packages/foo/src/file.ts')).toBe(true);
		expect(regex.test('./other/foo/')).toBe(false);
	});

	it('converts a double wildcard pattern', () => {
		const regex = convertGlobToRegex('./apps/**/');
		expect(regex.test('./apps/foo/')).toBe(true);
		expect(regex.test('./apps/foo/bar/')).toBe(true);
		expect(regex.test('./other/foo/')).toBe(false);
	});

	it('handles patterns without trailing slash', () => {
		const regex = convertGlobToRegex('./packages/*');
		expect(regex.test('./packages/foo')).toBe(true);
		expect(regex.test('./packages/foo/src')).toBe(true);
	});
});

describe('resolveWorkingDirectory', () => {
	const workspaceFolders = ['/workspace/monorepo'];

	beforeEach(() => {
		existsSyncMock.mockReset();
	});

	describe('when workingDirectories is undefined or empty', () => {
		it('returns undefined', () => {
			const result = resolveWorkingDirectory('/workspace/monorepo/src/file.html', workspaceFolders);
			expect(result).toBeUndefined();
		});

		it('returns undefined for empty array', () => {
			const result = resolveWorkingDirectory('/workspace/monorepo/src/file.html', workspaceFolders, []);
			expect(result).toBeUndefined();
		});
	});

	describe('string entries', () => {
		it('matches a file inside a specified directory', () => {
			const entries: WorkingDirectoryEntry[] = ['./client', './server'];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/client/src/index.html',
				workspaceFolders,
				entries,
			);
			expect(result).toEqual({ directory: path.resolve('/workspace/monorepo', './client') });
		});

		it('matches the deepest directory when multiple match', () => {
			const entries: WorkingDirectoryEntry[] = ['./packages', './packages/ui'];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/packages/ui/src/index.html',
				workspaceFolders,
				entries,
			);
			expect(result).toEqual({ directory: path.resolve('/workspace/monorepo', './packages/ui') });
		});

		it('returns undefined when no directory matches', () => {
			const entries: WorkingDirectoryEntry[] = ['./client'];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/server/src/index.html',
				workspaceFolders,
				entries,
			);
			expect(result).toBeUndefined();
		});
	});

	describe('directory object entries', () => {
		it('matches a file inside a specified directory object', () => {
			const entries: WorkingDirectoryEntry[] = [{ directory: './client' }];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/client/src/index.html',
				workspaceFolders,
				entries,
			);
			expect(result).toEqual({ directory: path.resolve('/workspace/monorepo', './client') });
		});

		it('handles absolute directory paths', () => {
			const entries: WorkingDirectoryEntry[] = [{ directory: '/absolute/path/project' }];
			const result = resolveWorkingDirectory('/absolute/path/project/src/index.html', workspaceFolders, entries);
			expect(result).toEqual({ directory: '/absolute/path/project' });
		});
	});

	describe('pattern entries', () => {
		it('matches files against a glob pattern', () => {
			const entries: WorkingDirectoryEntry[] = [{ pattern: './packages/*/' }];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/packages/ui/src/index.html',
				workspaceFolders,
				entries,
			);
			expect(result).toBeDefined();
			expect(result!.directory).toBe('/workspace/monorepo/packages/ui');
		});

		it('returns undefined when pattern does not match', () => {
			const entries: WorkingDirectoryEntry[] = [{ pattern: './packages/*/' }];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/other/src/index.html',
				workspaceFolders,
				entries,
			);
			expect(result).toBeUndefined();
		});
	});

	describe('mode: "location"', () => {
		it('returns workspace folder when no config file is found', () => {
			existsSyncMock.mockReturnValue(false);
			const entries: WorkingDirectoryEntry[] = [{ mode: 'location' }];
			const result = resolveWorkingDirectory('/workspace/monorepo/src/index.html', workspaceFolders, entries);
			expect(result).toEqual({ directory: '/workspace/monorepo' });
		});

		it('returns config directory when a markuplint config is found', () => {
			existsSyncMock.mockImplementation((p: unknown) => {
				return (p as string) === path.join('/workspace/monorepo/packages/ui', '.markuplintrc');
			});
			const entries: WorkingDirectoryEntry[] = [{ mode: 'location' }];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/packages/ui/src/index.html',
				workspaceFolders,
				entries,
			);
			expect(result).toEqual({ directory: '/workspace/monorepo/packages/ui' });
		});
	});

	describe('mode: "auto"', () => {
		it('returns the closest directory with package.json', () => {
			existsSyncMock.mockImplementation((p: unknown) => {
				return (p as string) === path.join('/workspace/monorepo/packages/ui', 'package.json');
			});
			const entries: WorkingDirectoryEntry[] = [{ mode: 'auto' }];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/packages/ui/src/index.html',
				workspaceFolders,
				entries,
			);
			expect(result).toEqual({ directory: '/workspace/monorepo/packages/ui' });
		});

		it('returns the closest directory with a markuplint config', () => {
			existsSyncMock.mockImplementation((p: unknown) => {
				return (p as string) === path.join('/workspace/monorepo/packages/ui', '.markuplintrc');
			});
			const entries: WorkingDirectoryEntry[] = [{ mode: 'auto' }];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/packages/ui/src/index.html',
				workspaceFolders,
				entries,
			);
			expect(result).toEqual({ directory: '/workspace/monorepo/packages/ui' });
		});

		it('returns undefined when no root indicator is found', () => {
			existsSyncMock.mockReturnValue(false);
			const entries: WorkingDirectoryEntry[] = [{ mode: 'auto' }];
			const result = resolveWorkingDirectory('/tmp/orphan/file.html', [], entries);
			expect(result).toBeUndefined();
		});
	});

	describe('mixed entries (priority)', () => {
		it('prefers the deepest match across entry types', () => {
			const entries: WorkingDirectoryEntry[] = ['./packages', { pattern: './packages/*/' }];
			const result = resolveWorkingDirectory(
				'/workspace/monorepo/packages/ui/src/index.html',
				workspaceFolders,
				entries,
			);
			// Pattern match for packages/ui is deeper than string match for packages
			expect(result).toBeDefined();
			expect(result!.directory).toBe('/workspace/monorepo/packages/ui');
		});
	});
});
