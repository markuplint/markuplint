import fs from 'node:fs';
import path from 'node:path';

/**
 * A working directory entry configuration, modeled after the ESLint VS Code extension.
 *
 * Supports:
 * - Plain string: a directory path relative to the workspace folder
 * - `{ directory, "!cwd"? }`: explicit directory with optional process.cwd control
 * - `{ pattern, "!cwd"? }`: glob pattern for dynamic directory detection
 * - `{ mode: "auto" | "location" }`: automatic working directory detection
 */
export type WorkingDirectoryEntry =
	| string
	| { readonly directory: string; readonly '!cwd'?: boolean }
	| { readonly pattern: string; readonly '!cwd'?: boolean }
	| { readonly mode: 'auto' | 'location' };

/**
 * The result of resolving a working directory for a file.
 */
export type ResolvedWorkingDirectory = {
	/** The resolved working directory path */
	readonly directory: string;
};

/**
 * Markuplint configuration file names used for auto-detection.
 */
const MARKUPLINT_CONFIG_FILES = [
	'.markuplintrc',
	'.markuplintrc.json',
	'.markuplintrc.yaml',
	'.markuplintrc.yml',
	'.markuplintrc.js',
	'.markuplintrc.cjs',
	'.markuplintrc.mjs',
	'.markuplintrc.ts',
	'markuplint.config.js',
	'markuplint.config.cjs',
	'markuplint.config.mjs',
	'markuplint.config.ts',
] as const;

/**
 * Files that indicate a project root boundary.
 */
const ROOT_INDICATOR_FILES = ['package.json', ...MARKUPLINT_CONFIG_FILES] as const;

/**
 * Converts a simple glob pattern (supporting `*` and `**`) into a RegExp.
 *
 * This is a simplified implementation for matching directory paths against
 * patterns like `./packages/* /` or `./apps/** /`.
 *
 * @param pattern - A glob pattern string (e.g. `"./packages/* /"`)
 * @returns A RegExp anchored at the start that matches directory paths
 */
export function convertGlobToRegex(pattern: string): RegExp {
	// Normalize and remove trailing slash
	let normalized = pattern.replaceAll('\\', '/');
	if (normalized.endsWith('/')) {
		normalized = normalized.slice(0, -1);
	}

	// Escape special regex chars except * and **
	let regexStr = '';
	let i = 0;
	while (i < normalized.length) {
		const char = normalized[i];
		if (char === '*') {
			if (normalized[i + 1] === '*') {
				regexStr += '.*';
				i += 2;
				// Skip optional trailing /
				if (normalized[i] === '/') {
					i++;
				}
			} else {
				regexStr += '[^/]*';
				i++;
			}
		} else if ('.+^${}()|[]\\'.includes(char!)) {
			regexStr += '\\' + char;
			i++;
		} else {
			regexStr += char;
			i++;
		}
	}

	return new RegExp('^' + regexStr + '(?:/|$)');
}

/**
 * Resolves the working directory for a given file based on workingDirectories configuration.
 *
 * @param filePath - Absolute file path of the document being linted
 * @param workspaceFolders - VS Code workspace folder paths (absolute)
 * @param workingDirectories - The user-configured working directories
 * @returns The resolved working directory, or `undefined` to use the default behavior
 */
export function resolveWorkingDirectory(
	filePath: string,
	workspaceFolders: readonly string[],
	workingDirectories?: readonly WorkingDirectoryEntry[],
): ResolvedWorkingDirectory | undefined {
	if (!workingDirectories || workingDirectories.length === 0) {
		return undefined;
	}

	const normalizedFilePath = filePath.replaceAll('\\', '/');
	let bestMatch: ResolvedWorkingDirectory | undefined;
	let bestMatchLength = -1;

	for (const entry of workingDirectories) {
		if (typeof entry === 'string') {
			const resolved = resolveDirectoryEntry(entry, workspaceFolders);
			if (resolved) {
				const match = matchDirectory(normalizedFilePath, resolved);
				if (match > bestMatchLength) {
					bestMatchLength = match;
					bestMatch = { directory: resolved };
				}
			}
			continue;
		}

		if ('mode' in entry) {
			const result = resolveByMode(filePath, workspaceFolders, entry.mode);
			if (result) {
				return result;
			}
			continue;
		}

		if ('directory' in entry) {
			const resolved = resolveDirectoryEntry(entry.directory, workspaceFolders);
			if (resolved) {
				const match = matchDirectory(normalizedFilePath, resolved);
				if (match > bestMatchLength) {
					bestMatchLength = match;
					bestMatch = { directory: resolved };
				}
			}
			continue;
		}

		if ('pattern' in entry) {
			const result = resolveByPattern(normalizedFilePath, workspaceFolders, entry.pattern);
			if (result && result.directory.length > bestMatchLength) {
				bestMatchLength = result.directory.length;
				bestMatch = result;
			}
		}
	}

	return bestMatch;
}

/**
 * Resolves a directory path relative to workspace folders.
 * Returns the first existing absolute path found.
 */
function resolveDirectoryEntry(directory: string, workspaceFolders: readonly string[]): string | undefined {
	// If already absolute and exists, use it directly
	if (path.isAbsolute(directory)) {
		return directory;
	}

	// Resolve relative to each workspace folder
	for (const folder of workspaceFolders) {
		const resolved = path.resolve(folder, directory);
		return resolved;
	}

	return undefined;
}

/**
 * Checks if a file path is inside a directory.
 * Returns the directory path length if matched, -1 otherwise.
 */
function matchDirectory(normalizedFilePath: string, directory: string): number {
	const normalizedDir = directory.replaceAll('\\', '/');
	const dirWithSlash = normalizedDir.endsWith('/') ? normalizedDir : normalizedDir + '/';
	if (normalizedFilePath.startsWith(dirWithSlash)) {
		return dirWithSlash.length;
	}
	return -1;
}

/**
 * Resolves working directory by glob pattern matching against workspace folders.
 */
function resolveByPattern(
	normalizedFilePath: string,
	workspaceFolders: readonly string[],
	pattern: string,
): ResolvedWorkingDirectory | undefined {
	for (const folder of workspaceFolders) {
		const normalizedFolder = folder.replaceAll('\\', '/');
		const fullPattern = pattern.startsWith('./')
			? normalizedFolder + pattern.slice(1)
			: path.posix.join(normalizedFolder, pattern);

		const regex = convertGlobToRegex(fullPattern);
		if (regex.test(normalizedFilePath)) {
			// Extract the matched directory portion
			const match = regex.exec(normalizedFilePath);
			if (match) {
				let matchedDir = match[0];
				if (matchedDir.endsWith('/')) {
					matchedDir = matchedDir.slice(0, -1);
				}
				return { directory: matchedDir };
			}
		}
	}

	return undefined;
}

/**
 * Resolves working directory by mode ("auto" or "location").
 */
function resolveByMode(
	filePath: string,
	workspaceFolders: readonly string[],
	mode: 'auto' | 'location',
): ResolvedWorkingDirectory | undefined {
	if (mode === 'location') {
		// Use workspace folder path. If a markuplint config is found closer to the file,
		// use that directory instead.
		const configDir = findClosestConfigDir(filePath, workspaceFolders);
		if (configDir) {
			return { directory: configDir };
		}

		// Fall back to workspace folder containing the file
		for (const folder of workspaceFolders) {
			const normalizedFolder = folder.replaceAll('\\', '/');
			const normalizedFilePath = filePath.replaceAll('\\', '/');
			if (
				normalizedFilePath.startsWith(normalizedFolder + '/') ||
				normalizedFilePath.startsWith(normalizedFolder + '\\')
			) {
				return { directory: folder };
			}
		}
		return undefined;
	}

	// mode === 'auto'
	// Walk up from the file's directory to find the closest project root
	// (indicated by package.json or markuplint config files)
	const autoDir = findAutoWorkingDirectory(filePath, workspaceFolders);
	if (autoDir) {
		return { directory: autoDir };
	}

	return undefined;
}

/**
 * Finds the closest directory containing a markuplint config file,
 * walking up from the file's parent directory to the workspace root.
 */
function findClosestConfigDir(filePath: string, workspaceFolders: readonly string[]): string | undefined {
	const fileDir = path.dirname(filePath);
	const workspaceRoot = findContainingWorkspace(filePath, workspaceFolders);
	const stopDir = workspaceRoot ?? path.parse(fileDir).root;

	let current = fileDir;
	while (current.length >= stopDir.length) {
		for (const configFile of MARKUPLINT_CONFIG_FILES) {
			if (fs.existsSync(path.join(current, configFile))) {
				return current;
			}
		}

		const parent = path.dirname(current);
		if (parent === current) {
			break;
		}
		current = parent;
	}

	return undefined;
}

/**
 * Finds the closest directory containing a root indicator file (package.json or markuplint config),
 * walking up from the file's parent directory to the workspace root.
 * Used by "auto" mode.
 */
function findAutoWorkingDirectory(filePath: string, workspaceFolders: readonly string[]): string | undefined {
	const fileDir = path.dirname(filePath);
	const workspaceRoot = findContainingWorkspace(filePath, workspaceFolders);
	const stopDir = workspaceRoot ?? path.parse(fileDir).root;

	let current = fileDir;
	while (current.length >= stopDir.length) {
		for (const rootFile of ROOT_INDICATOR_FILES) {
			if (fs.existsSync(path.join(current, rootFile))) {
				return current;
			}
		}

		const parent = path.dirname(current);
		if (parent === current) {
			break;
		}
		current = parent;
	}

	return undefined;
}

/**
 * Finds the workspace folder that contains the given file path.
 */
function findContainingWorkspace(filePath: string, workspaceFolders: readonly string[]): string | undefined {
	const normalizedFilePath = filePath.replaceAll('\\', '/');
	for (const folder of workspaceFolders) {
		const normalizedFolder = folder.replaceAll('\\', '/');
		if (normalizedFilePath.startsWith(normalizedFolder + '/')) {
			return folder;
		}
	}
	return undefined;
}
