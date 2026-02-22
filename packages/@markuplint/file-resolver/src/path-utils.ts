import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Convert OS-native separators to forward slashes.
 * Identity function on POSIX.
 */
export function toSlash(filePath: string): string {
	return filePath.replaceAll('\\', '/');
}

/**
 * Convert a `file://` URL to a native file path using Node.js built-in.
 * Correctly handles URL encoding, UNC paths, and all drive letters.
 */
export function fromFileURL(fileUrl: string): string {
	return fileURLToPath(fileUrl);
}

/**
 * Normalize a path for the `ignore` library (gitignore-style matching).
 * Removes drive letters, converts to forward slashes, and optionally makes relative.
 */
export function normalizeForIgnore(filePath: string, relative = false): string {
	const hasBang = filePath.startsWith('!');
	if (hasBang) {
		filePath = filePath.slice(1);
	}

	// Remove the local disk scheme of Windows OS (e.g. "C:", "P:")
	if (path.isAbsolute(filePath) || /^[a-z]:/i.test(filePath)) {
		filePath = filePath.replace(/^[a-z]+:/i, '');
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

/**
 * Normalize a path for glob libraries (forward slashes required).
 */
export function normalizeForGlob(filePath: string): string {
	return toSlash(filePath);
}
