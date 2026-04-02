/**
 * nu-html-checker (https://github.com/validator/validator) compatibility tests.
 *
 * These tests run markuplint against the nu-html-checker test suite to
 * benchmark HTML validation coverage.
 *
 * Setup (submodule must be fetched manually):
 *   git submodule update --init tests/external/validator
 *
 * Run:
 *   npx vitest run --config vitest.nu-validator.config.ts
 *
 * Update to latest:
 *   git submodule update --remote tests/external/validator
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { describe, test, expect } from 'vitest';

import { mlTest } from 'markuplint';
import type { Config } from '@markuplint/ml-config';

import {
	allRulesConfig,
	getExpectedResult,
	collectTestableHtmlFiles,
	relPath,
} from './nu-validator-utils.js';

const VALIDATOR_TESTS_DIR = path.resolve(__dirname, 'validator/tests');
const SUBMODULE_AVAILABLE = existsSync(path.join(VALIDATOR_TESTS_DIR, 'html'));

/**
 * Generates test cases for a list of HTML files.
 */
function generateTests(files: string[], config: Config) {
	for (const filePath of files) {
		const rel = relPath(filePath, VALIDATOR_TESTS_DIR);
		const expected = getExpectedResult(path.basename(filePath));

		if (expected === 'error') {
			test(`${rel} should report violations`, async () => {
				const sourceCode = readFileSync(filePath, 'utf-8');
				const { violations } = await mlTest(sourceCode, config);
				expect(
					violations.length,
					`Expected violations for ${rel} but got none`,
				).toBeGreaterThan(0);
			});
		} else if (expected === 'valid') {
			test(`${rel} should pass without violations`, async () => {
				const sourceCode = readFileSync(filePath, 'utf-8');
				const { violations } = await mlTest(sourceCode, config);
				expect(
					violations,
					`Expected no violations for ${rel} but got:\n${violations.map(v => `  [${v.line}:${v.col}] (${v.ruleId}) ${v.message}`).join('\n')}`,
				).toHaveLength(0);
			});
		}
		// warn files are skipped — markuplint has no warn/error distinction
	}
}

const SKIP_MSG = 'validator submodule not found — run: git submodule update --init tests/external/validator';

// ============================================================
// 1. Content Model Tests (all rules)
// ============================================================
describe('nu-validator: Content Model', () => {
	const elementsDir = path.join(VALIDATOR_TESTS_DIR, 'html/elements');
	if (!SUBMODULE_AVAILABLE) {
		test.skip(SKIP_MSG, () => {});
		return;
	}

	const modelFiles = collectTestableHtmlFiles(elementsDir).filter(f => path.basename(f).startsWith('model-'));
	generateTests(modelFiles, allRulesConfig);
});

// ============================================================
// 2. Deprecated/Obsolete Element Tests
// ============================================================
describe('nu-validator: Deprecated Elements', () => {
	const obsoleteDir = path.join(VALIDATOR_TESTS_DIR, 'html/obsolete');
	if (!SUBMODULE_AVAILABLE) {
		test.skip(SKIP_MSG, () => {});
		return;
	}

	const files = collectTestableHtmlFiles(obsoleteDir).filter(
		f => getExpectedResult(path.basename(f)) === 'error',
	);
	generateTests(files, { rules: { 'deprecated-element': true } });
});

// ============================================================
// 3. Required Attribute Tests
// ============================================================
describe('nu-validator: Required Attributes', () => {
	const assertionsDir = path.join(VALIDATOR_TESTS_DIR, 'html/assertions');
	if (!SUBMODULE_AVAILABLE) {
		test.skip(SKIP_MSG, () => {});
		return;
	}

	const requiredAttrFiles = collectTestableHtmlFiles(assertionsDir).filter(f => {
		const basename = path.basename(f);
		return basename.includes('missing') && basename.includes('-novalid');
	});
	generateTests(requiredAttrFiles, { rules: { 'required-attr': true } });
});

// ============================================================
// 4. Invalid Attribute Tests (per-element)
// ============================================================
describe('nu-validator: Invalid Attributes', () => {
	const elementsDir = path.join(VALIDATOR_TESTS_DIR, 'html/elements');
	if (!SUBMODULE_AVAILABLE) {
		test.skip(SKIP_MSG, () => {});
		return;
	}

	const attrFiles = collectTestableHtmlFiles(elementsDir).filter(f => {
		const basename = path.basename(f);
		return (basename.includes('-novalid') || basename.includes('-isvalid')) && !basename.startsWith('model-');
	});
	generateTests(attrFiles, allRulesConfig);
});

// ============================================================
// 5. Global Attribute Tests
// ============================================================
describe('nu-validator: Global Attributes', () => {
	const attrsDir = path.join(VALIDATOR_TESTS_DIR, 'html/attributes');
	if (!SUBMODULE_AVAILABLE) {
		test.skip(SKIP_MSG, () => {});
		return;
	}

	const files = collectTestableHtmlFiles(attrsDir);
	generateTests(files, allRulesConfig);
});

// ============================================================
// 6. ID Duplication Tests
// ============================================================
describe('nu-validator: ID Duplication', () => {
	const assertionsDir = path.join(VALIDATOR_TESTS_DIR, 'html/assertions');
	if (!SUBMODULE_AVAILABLE) {
		test.skip(SKIP_MSG, () => {});
		return;
	}

	const idFiles = collectTestableHtmlFiles(assertionsDir).filter(f =>
		path.basename(f).toLowerCase().includes('duplicate-id'),
	);
	generateTests(idFiles, { rules: { 'id-duplication': true } });
});

// ============================================================
// 7. ARIA Tests
// ============================================================
describe('nu-validator: ARIA', () => {
	const ariaDir = path.join(VALIDATOR_TESTS_DIR, 'html-aria');
	if (!SUBMODULE_AVAILABLE) {
		test.skip(SKIP_MSG, () => {});
		return;
	}

	const files = collectTestableHtmlFiles(ariaDir);
	generateTests(files, allRulesConfig);
});

// ============================================================
// 8. Assertions (other)
// ============================================================
describe('nu-validator: Assertions', () => {
	const assertionsDir = path.join(VALIDATOR_TESTS_DIR, 'html/assertions');
	if (!SUBMODULE_AVAILABLE) {
		test.skip(SKIP_MSG, () => {});
		return;
	}

	// Exclude files already covered by Required Attributes and ID Duplication
	const files = collectTestableHtmlFiles(assertionsDir).filter(f => {
		const basename = path.basename(f);
		const isMissing = basename.includes('missing') && basename.includes('-novalid');
		const isDuplicateId = basename.toLowerCase().includes('duplicate-id');
		return !isMissing && !isDuplicateId;
	});
	generateTests(files, allRulesConfig);
});

// ============================================================
// 9. Data Type Tests
// ============================================================
describe('nu-validator: Data Types', () => {
	const datatypesDir = path.join(VALIDATOR_TESTS_DIR, 'html/datatypes');
	if (!SUBMODULE_AVAILABLE) {
		test.skip(SKIP_MSG, () => {});
		return;
	}

	const files = collectTestableHtmlFiles(datatypesDir);
	generateTests(files, allRulesConfig);
});
