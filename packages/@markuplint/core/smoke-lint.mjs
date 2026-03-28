/**
 * Smoke test for the Rust lint pipeline via NAPI.
 *
 * Verifies: TS html-parser -> MLAST JSON -> Rust lint() -> Violations
 *
 * Run: node packages/@markuplint/core/smoke-lint.mjs
 */

import { createRequire } from 'node:module';
import { parser } from '@markuplint/html-parser';

// NAPI binary must be loaded via require (native addon)
const require_ = createRequire(import.meta.url);
const { lint } = require_('./index.js');
const htmlSpec = require_('@markuplint/html-spec');

const specJson = JSON.stringify(htmlSpec);

function lintHtml(html, rules) {
	const ast = parser.parse(html);
	return lint(JSON.stringify(ast), JSON.stringify({ rules }), specJson);
}

// Test 1: Detects duplicate attributes
const v1 = lintHtml('<div class="a" class="b"></div>', { 'attr-duplication': true });
if (v1.length !== 1) throw new Error('Test 1 FAIL: expected 1 violation, got ' + v1.length);
if (v1[0].ruleId !== 'attr-duplication') throw new Error('Test 1 FAIL: wrong ruleId');
if (v1[0].severity !== 'error') throw new Error('Test 1 FAIL: wrong severity');
if (v1[0].line !== 1) throw new Error('Test 1 FAIL: wrong line');
if (v1[0].col <= 1) throw new Error('Test 1 FAIL: col should be > 1');

// Test 2: Clean HTML
const v2 = lintHtml('<div class="a" id="b"></div>', { 'attr-duplication': true });
if (v2.length > 0) throw new Error('Test 2 FAIL: expected 0, got ' + v2.length);

// Test 3: Disabled rule
const v3 = lintHtml('<div class="a" class="b"></div>', { 'attr-duplication': false });
if (v3.length > 0) throw new Error('Test 3 FAIL: expected 0 (disabled), got ' + v3.length);

// Test 4: Severity override
const v4 = lintHtml('<div id="x" id="y"></div>', { 'attr-duplication': 'warning' });
if (v4.length !== 1) throw new Error('Test 4 FAIL: expected 1, got ' + v4.length);
if (v4[0].severity !== 'warning') throw new Error('Test 4 FAIL: severity should be warning');

// Test 5: Multiple elements
const v5 = lintHtml('<div class="a" class="b"></div><span id="x" id="y"></span>', { 'attr-duplication': true });
if (v5.length !== 2) throw new Error('Test 5 FAIL: expected 2, got ' + v5.length);

// eslint-disable-next-line no-console -- smoke test output
console.log('Rust lint pipeline smoke test: all 5 tests passed');
// eslint-disable-next-line no-console -- smoke test output
console.log('Sample violation:', JSON.stringify(v1[0]));
