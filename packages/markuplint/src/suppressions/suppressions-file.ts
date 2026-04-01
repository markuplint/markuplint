import type { SuppressionsData } from './types.js';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { isFatalError } from '@markuplint/shared';

const DEFAULT_FILE_NAME = 'markuplint-suppressions.json';

/**
 * @experimental
 * Resolves the absolute path to the suppressions file.
 *
 * @param customPath - Optional custom path (relative or absolute). Defaults to `markuplint-suppressions.json` in CWD.
 * @returns The absolute file path.
 */
export function resolveSuppressionsPath(customPath?: string): string {
	if (customPath) {
		return path.isAbsolute(customPath) ? customPath : path.resolve(process.cwd(), customPath);
	}
	return path.resolve(process.cwd(), DEFAULT_FILE_NAME);
}

/**
 * @experimental
 * Reads and parses a suppressions JSON file.
 * Returns an empty object if the file does not exist.
 *
 * @param filePath - Absolute path to the suppressions file.
 * @returns The parsed suppressions data, or an empty object if the file does not exist.
 */
export async function readSuppressionsFile(filePath: string): Promise<SuppressionsData> {
	try {
		const content = await fs.readFile(filePath, 'utf8');
		return JSON.parse(content) as SuppressionsData;
	} catch (error) {
		if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
			return {};
		}
		if (error instanceof SyntaxError) {
			// eslint-disable-next-line unicorn/prefer-type-error -- Not a type error; this is a JSON parse failure
			throw new Error(`Failed to parse suppressions file "${filePath}": ${error.message}`, { cause: error });
		}
		if (isFatalError(error)) {
			throw error;
		}
		throw error;
	}
}

/**
 * @experimental
 * Writes suppressions data to a JSON file with sorted keys.
 * Deletes the file if data is empty.
 *
 * @param filePath - Absolute path to the suppressions file.
 * @param data - The suppressions data to write.
 */
// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export async function writeSuppressionsFile(filePath: string, data: SuppressionsData): Promise<void> {
	// If empty, delete the file rather than leaving an empty JSON object.
	// This avoids committing a useless file to the repository.
	if (Object.keys(data).length === 0) {
		try {
			await fs.unlink(filePath);
		} catch (error) {
			if (isFatalError(error)) {
				throw error;
			}
			// ENOENT is expected when the file doesn't already exist
		}
		return;
	}

	// Sort top-level keys and nested keys
	const sorted: SuppressionsData = {};
	for (const fileKey of Object.keys(data).toSorted()) {
		const rules = data[fileKey];
		const sortedRules: Record<string, { count: number }> = {};
		for (const ruleKey of Object.keys(rules!).toSorted()) {
			sortedRules[ruleKey] = rules![ruleKey]!;
		}
		sorted[fileKey] = sortedRules;
	}

	const content = JSON.stringify(sorted, null, '\t') + '\n';
	await fs.writeFile(filePath, content, 'utf8');
}

/**
 * @experimental
 * Converts an absolute file path to a relative path based on the suppressions file location.
 * Always uses POSIX separators for cross-platform consistency.
 *
 * @param absoluteFilePath - The absolute path to the linted file.
 * @param suppressionsFilePath - The absolute path to the suppressions file.
 * @returns The relative path using POSIX separators.
 */
export function toRelativePath(absoluteFilePath: string, suppressionsFilePath: string): string {
	const dir = path.dirname(suppressionsFilePath);
	const rel = path.relative(dir, absoluteFilePath);
	// Normalize to POSIX separators
	return rel.split(path.sep).join('/');
}

/**
 * @experimental
 * Converts a relative path (from the suppressions file) back to an absolute path.
 *
 * @param relativeFilePath - The relative path stored in the suppressions file.
 * @param suppressionsFilePath - The absolute path to the suppressions file.
 * @returns The absolute file path.
 */
export function toAbsolutePath(relativeFilePath: string, suppressionsFilePath: string): string {
	const dir = path.dirname(suppressionsFilePath);
	return path.resolve(dir, relativeFilePath);
}
