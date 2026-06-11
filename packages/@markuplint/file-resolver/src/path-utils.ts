import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Identity function on POSIX. */
export function toSlash(filePath: string): string {
	return filePath.replaceAll('\\', '/');
}

export function fromFileURL(fileUrl: string): string {
	return fileURLToPath(fileUrl);
}

/**
 * Convert an absolute file path (Windows or POSIX) into a `file://` URL
 * suitable for `import()`. Bare module specifiers and relative paths are
 * returned unchanged.
 *
 * Node's `pathToFileURL()` is intentionally avoided: on Windows it
 * resolves a POSIX-style absolute path against the *current drive* and
 * emits `file:///D:/tmp/foo` instead of `file:///tmp/foo` (#3840); on
 * POSIX it likewise mishandles Windows-style drive paths. Constructing
 * the URL ourselves keeps the function OS-independent so POSIX CI
 * exercises the Windows code path. Each segment is percent-encoded so
 * that spaces (`Program Files`), non-ASCII characters (e.g. Japanese
 * usernames), and URL-reserved characters like `#` / `?` do not get
 * reinterpreted as fragment / query delimiters by Node's URL parser.
 *
 * Mirrors `vscode/src/server/get-module.ts`'s `toImportSpecifier()` —
 * keep the two in sync when adjusting Windows-path handling.
 *
 * Known limitation: UNC paths (`\\server\share\...`) are passed through
 * unchanged.
 *
 * @see https://github.com/markuplint/markuplint/issues/3840
 * @see https://github.com/markuplint/markuplint/issues/3836
 * @see https://nodejs.org/api/esm.html#urls
 */
export function toFileURL(filePath: string): string {
	const isWindowsAbsolute = /^[a-z]:[/\\]/i.test(filePath);
	const isPosixAbsolute = filePath.startsWith('/');
	if (!isWindowsAbsolute && !isPosixAbsolute) {
		return filePath;
	}
	if (isWindowsAbsolute) {
		// The drive-letter segment (`c:`) is kept as-is to match the
		// `pathToFileURL` output shape on Windows (`file:///c:/...`).
		const [drive, ...rest] = filePath.replaceAll('\\', '/').split('/');
		const encoded = [drive, ...rest.map(segment => encodeURIComponent(segment))].join('/');
		return `file:///${encoded}`;
	}
	// POSIX absolute path. Splitting `/tmp/foo` by `/` yields `['', 'tmp',
	// 'foo']`; the leading empty element produces the `file:///` prefix
	// after `join('/')`, so the round-trip is exactly `file:///tmp/foo`.
	const segments = filePath.split('/').map(segment => encodeURIComponent(segment));
	return `file://${segments.join('/')}`;
}

/** Normalizes for the `ignore` library, whose matching is gitignore-style. */
export function normalizeForIgnore(filePath: string, relative = false): string {
	const hasBang = filePath.startsWith('!');
	if (hasBang) {
		filePath = filePath.slice(1);
	}

	// Remove the local disk scheme of Windows OS (e.g. "C:", "P:")
	if (path.isAbsolute(filePath) || /^[a-z]:/i.test(filePath)) {
		filePath = filePath.replace(/^[a-z]:/i, '');
	}

	// Convert backslashes to forward slashes
	filePath = toSlash(filePath);

	if (relative) {
		// Strip leading slashes to make the path relative
		filePath = filePath.replace(/^\/+/, '');
	}

	if (hasBang) {
		filePath = `!${filePath}`;
	}

	return filePath;
}

/** Glob libraries require forward slashes. */
export function normalizeForGlob(filePath: string): string {
	return toSlash(filePath);
}
