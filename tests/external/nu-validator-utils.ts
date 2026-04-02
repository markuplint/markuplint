/**
 * Shared utilities for nu-html-checker compatibility tests.
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';

import type { Config } from '@markuplint/ml-config';

/**
 * markuplint config enabling all HTML validation rules used in
 * the nu-validator compatibility benchmark.
 *
 * When adding a new markuplint rule to the benchmark, update this
 * config AND add a corresponding test category in both
 * nu-validator-report.ts and nu-validator.spec.ts.
 */
export const allRulesConfig: Config = {
	rules: {
		'permitted-contents': true,
		'required-attr': true,
		'invalid-attr': true,
		'deprecated-element': true,
		'deprecated-attr': true,
		'id-duplication': true,
		'wai-aria': true,
	},
};

/**
 * Determines expected test result from nu-validator filename convention:
 * - `*-novalid.html` → should have errors
 * - `*-haswarn.html` → warning expected (skipped — markuplint has no warn/error distinction)
 * - `*-isvalid.html` → should have no errors
 * - other            → treated as valid
 *
 * @param filename - The HTML test filename (e.g., `model-novalid.html`)
 * @returns The expected result category
 * @see https://github.com/validator/validator/blob/main/tests/
 */
export function getExpectedResult(filename: string): 'error' | 'valid' | 'warn' {
	if (filename.includes('-novalid')) return 'error';
	if (filename.includes('-haswarn')) return 'warn';
	if (filename.includes('-isvalid')) return 'valid';
	return 'valid';
}

/**
 * Returns true if the file is testable (not a haswarn file).
 *
 * @param filename - The HTML test filename
 * @returns Whether the file should be included in benchmarks
 */
export function isTestable(filename: string): boolean {
	return getExpectedResult(filename) !== 'warn';
}

/**
 * Collects HTML test files recursively from a directory.
 *
 * @param dir - The directory to search
 * @returns Absolute paths to all `.html` files found
 */
export function collectHtmlFiles(dir: string): string[] {
	const files: string[] = [];
	if (!existsSync(dir)) return files;
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			files.push(...collectHtmlFiles(full));
		} else if (entry.endsWith('.html')) {
			files.push(full);
		}
	}
	return files;
}

/**
 * Collects testable HTML files (excluding haswarn) from a directory.
 *
 * @param dir - The directory to search
 * @returns Absolute paths to testable `.html` files
 */
export function collectTestableHtmlFiles(dir: string): string[] {
	return collectHtmlFiles(dir).filter(f => isTestable(path.basename(f)));
}

/**
 * Returns a relative path from the validator tests dir for display.
 *
 * @param filePath - Absolute path to the file
 * @param validatorTestsDir - Absolute path to the validator tests root
 * @returns The relative path for use in reports and test names
 */
export function relPath(filePath: string, validatorTestsDir: string): string {
	return path.relative(validatorTestsDir, filePath);
}
