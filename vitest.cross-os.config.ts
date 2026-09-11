import { defineConfig } from 'vitest/config';

/**
 * Cross-OS test configuration for macOS/Windows runners.
 *
 * Only packages that use OS-dependent path operations (path.sep,
 * drive-letter handling, backslash normalisation, etc.) are included.
 * All other packages run on Linux only (vitest.config.ts).
 *
 * Selection criteria — include a package here when its source or
 * tests use any of:
 *   - `path.sep`, `path.delimiter`
 *   - Windows drive-letter patterns (`/^[a-z]+:/i`)
 *   - Backslash escaping / normalisation in file paths
 *   - `glob()` with user-supplied paths that may contain `\`
 *
 * When adding a new package with path-sensitive logic, add it here
 * so it is also exercised on macOS/Windows.
 */
export default defineConfig({
	test: {
		include: [
			'./packages/markuplint/**/*.spec.{js,mjs,ts}',
			'./packages/@markuplint/file-resolver/**/*.spec.{js,mjs,ts}',
			'./packages/@markuplint/create-rule/src/**/*.spec.{js,mjs,ts}',
			'./packages/@markuplint/pretenders/**/*.spec.{js,mjs,ts}',
		],
		testTimeout: 10000,
	},
});
