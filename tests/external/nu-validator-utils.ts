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
		'no-duplicate-autofocus': true,
		'no-duplicate-visible-main': true,
		'placeholder-label-option': true,
		'link-types': { options: { allowMicroformats: true } },
		'no-orphaned-end-tag': true,
		'srcset-sizes-constraint': true,
		// Normative-only ARIA sub-rules.
		// Non-normative checks (implicit-role, deprecated-role, etc.)
		// are excluded because they don't correspond to nu-validator checks.
		'wai-aria-non-existent-role': true,
		'wai-aria-abstract-role': true,
		'wai-aria-permitted-roles': true,
		'wai-aria-required-props': true,
		'wai-aria-disallowed-props': true,
		'wai-aria-value': true,
		'wai-aria-required-owned-elements': true,
		'wai-aria-required-parent-role': true,
		'wai-aria-no-global-prop': true,
	},
};

/**
 * Determines expected test result from nu-validator filename convention:
 * - `*-novalid.html` → should have errors
 * - `*-haswarn.html` → warning expected (skipped)
 * - `*-hasinfo.html` → info expected (skipped)
 * - `*-isvalid.html` → should have no errors
 * - other            → treated as valid
 *
 * haswarn and hasinfo files are skipped because markuplint has no
 * warn/info severity distinction — it would either false-positive
 * (reporting error on an info-level issue) or false-negative
 * (not detecting the info-level issue at all).
 *
 * @param filename - The HTML test filename (e.g., `model-novalid.html`)
 * @returns The expected result category
 * @see https://github.com/validator/validator/blob/main/src/nu/validator/client/TestRunner.java
 */
export function getExpectedResult(filename: string): 'error' | 'valid' | 'skip' {
	if (filename.includes('-novalid')) return 'error';
	if (filename.includes('-haswarn')) return 'skip';
	if (filename.includes('-hasinfo')) return 'skip';
	if (filename.includes('-isvalid')) return 'valid';
	return 'valid';
}

/**
 * Returns true if the file is testable (not a haswarn/hasinfo file
 * and not a known spec leniency case).
 *
 * @param filePath - The full path or relative path to the HTML test file
 * @returns Whether the file should be included in benchmarks
 */
export function isTestable(filePath: string): boolean {
	const filename = path.basename(filePath);
	if (getExpectedResult(filename) === 'skip') {
		return false;
	}
	if (isNuValidatorSpecLeniency(filePath)) {
		return false;
	}
	return true;
}

/**
 * Identifies nu-validator test files where nu-validator's interpretation
 * is more lenient than the W3C ARIA specification. In these cases,
 * markuplint's stricter behavior is spec-correct and should not be
 * counted as a discrepancy.
 *
 * Excluded cases:
 * - `roles-properties-supported-inherited/*-aria-expanded-*`:
 *   aria-expanded is NOT a global property and is NOT inherited from
 *   roletype. It is only defined on specific roles (button, combobox, etc.).
 *   Verified against ARIA 1.2 and 1.3.
 * - `mixed-value/*` and `*-aria-checked-mixed/undefined*` on non-tristate roles:
 *   aria-checked on radio/menuitemradio/option only accepts true/false.
 *   tristate (mixed) is only valid on checkbox/menuitemcheckbox per ARIA 1.2.
 *
 * @param filePath - The full path or relative path to the HTML test file
 * @returns Whether the file is a known nu-validator spec leniency case
 */
export function isNuValidatorSpecLeniency(filePath: string): boolean {
	const normalized = filePath.replaceAll(path.sep, '/');

	// aria-expanded on roles that don't define it (not inherited from roletype)
	if (
		normalized.includes('roles-properties-supported-inherited/') &&
		normalized.includes('-aria-expanded-')
	) {
		return true;
	}

	// aria-checked="mixed" on non-tristate roles (radio, menuitemradio, option)
	if (normalized.includes('mixed-value/')) {
		return true;
	}
	if (
		normalized.includes('-aria-checked-mixed') ||
		normalized.includes('-aria-checked-undefined')
	) {
		// Only exclude for roles where tristate is not valid
		// (checkbox and menuitemcheckbox DO support tristate — don't exclude those)
		if (
			normalized.includes('radio-') ||
			normalized.includes('menuitemradio-') ||
			normalized.includes('option-')
		) {
			return true;
		}
	}

	return false;
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
	return collectHtmlFiles(dir).filter(f => isTestable(f));
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
