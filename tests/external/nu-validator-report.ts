/**
 * nu-html-checker compatibility report generator.
 *
 * Runs markuplint against the nu-html-checker test suite and outputs
 * a structured report with pass/fail rates and failure analysis.
 *
 * Setup:
 *   git submodule update --init tests/external/validator
 *
 * Run:
 *   node --experimental-strip-types tests/external/nu-validator-report.ts
 *
 * Update to latest:
 *   git submodule update --remote tests/external/validator
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mlTest } from 'markuplint';
import type { Config } from '@markuplint/ml-config';

import {
	allRulesConfig,
	getExpectedResult,
	collectTestableHtmlFiles,
	relPath,
} from './nu-validator-utils.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VALIDATOR_TESTS_DIR = path.resolve(__dirname, 'validator/tests');
const MESSAGES_PATH = path.join(VALIDATOR_TESTS_DIR, 'messages.json');

// ── Types ───────────────────────────────────────────────────

interface TestResult {
	file: string;
	expected: 'error' | 'valid';
	actual: 'error' | 'clean';
	pass: boolean;
	parseError: boolean;
	violations: Array<{ ruleId: string; message: string; line: number; col: number }>;
}

interface CategoryReport {
	name: string;
	results: TestResult[];
}

// ── Test runner ─────────────────────────────────────────────

async function runFile(
	filePath: string,
	config: Config,
): Promise<TestResult> {
	const sourceCode = readFileSync(filePath, 'utf-8');
	const { violations } = await mlTest(sourceCode, config);
	const expected = getExpectedResult(path.basename(filePath)) as 'error' | 'valid';
	const actual = violations.length > 0 ? 'error' : 'clean';
	const parseError = violations.some(v => v.ruleId === 'parse-error');

	let pass: boolean;
	if (expected === 'error') {
		pass = actual === 'error';
	} else {
		pass = actual === 'clean';
	}

	return {
		file: relPath(filePath, VALIDATOR_TESTS_DIR),
		expected,
		actual,
		pass,
		parseError,
		violations: violations.map(v => ({
			ruleId: v.ruleId,
			message: v.message,
			line: v.line,
			col: v.col,
		})),
	};
}

async function runCategory(
	name: string,
	files: string[],
	config: Config,
): Promise<CategoryReport> {
	const results: TestResult[] = [];
	for (const file of files) {
		results.push(await runFile(file, config));
	}
	return { name, results };
}

// ── Report formatting ───────────────────────────────────────

function formatReport(categories: CategoryReport[], nuMessages: Record<string, string>): string {
	const lines: string[] = [];
	const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
	lines.push(`# nu-html-checker Compatibility Report`);
	lines.push(`Generated: ${now}\n`);

	// ── Legend ──
	lines.push('## Legend\n');
	lines.push('- **Pass**: markuplint\'s result matches nu-validator\'s expectation');
	lines.push('- **Fail**: markuplint\'s result differs from nu-validator\'s expectation');
	lines.push('- **Missed Error**: nu-validator expects an error but markuplint reports none (false negative)');
	lines.push('- **False Positive**: nu-validator considers valid but markuplint reports violations');
	lines.push('- **Parse Error**: markuplint\'s parser failed on a valid file (parser limitation)');
	lines.push('- **Rate**: Pass / Total — higher is better\n');
	lines.push('### Missed Error Reasons\n');
	lines.push('- **Bad value**: nu-validator checks attribute value types (URL format, color codes, dates, etc.) deeply; markuplint checks attribute existence but not value format');
	lines.push('- **Forbidden code point**: Unicode control character detection — not implemented in markuplint');
	lines.push('- **Must-not constraint**: Complex cross-element constraints (e.g., "main must not appear inside article")');
	lines.push('- **Attribute not allowed on element**: Conditional attribute restrictions based on element state');
	lines.push('- **Stray element**: Elements appearing where no element is expected\n');

	// ── Summary table ──
	let totalPass = 0;
	let totalFail = 0;

	lines.push('## Summary\n');
	lines.push('| Category | Pass | Fail | Total | Rate |');
	lines.push('|----------|------|------|-------|------|');

	for (const cat of categories) {
		const pass = cat.results.filter(r => r.pass).length;
		const fail = cat.results.filter(r => !r.pass).length;
		const total = pass + fail;
		const rate = total > 0 ? ((pass / total) * 100).toFixed(1) : '—';
		totalPass += pass;
		totalFail += fail;
		lines.push(`| ${cat.name} | ${pass} | ${fail} | ${total} | ${rate}% |`);
	}

	const totalAll = totalPass + totalFail;
	const totalRate = totalAll > 0 ? ((totalPass / totalAll) * 100).toFixed(1) : '—';
	lines.push(`| **TOTAL** | **${totalPass}** | **${totalFail}** | **${totalAll}** | **${totalRate}%** |`);
	lines.push('');

	// ── Failure analysis ──
	lines.push('## Failure Analysis\n');

	const missedErrors: TestResult[] = [];
	const falsePositives: TestResult[] = [];
	const parseErrors: TestResult[] = [];

	for (const cat of categories) {
		for (const r of cat.results) {
			if (!r.pass) {
				if (r.expected === 'error' && r.actual === 'clean') {
					missedErrors.push(r);
				} else if (r.expected === 'valid' && r.actual === 'error') {
					if (r.parseError && r.violations.every(v => v.ruleId === 'parse-error')) {
						parseErrors.push(r);
					} else {
						falsePositives.push(r);
					}
				}
			}
		}
	}

	// ── Missed errors by nu-validator message pattern ──
	lines.push(`### Missed Errors (${missedErrors.length} files)\n`);
	lines.push('markuplint reported no violation, but nu-validator expected an error.\n');

	// Message pattern classification.
	// These patterns match the error messages in nu-validator's tests/messages.json.
	// If nu-validator changes its message format, update the patterns below.
	const msgCategories: Record<string, string[]> = {};
	for (const r of missedErrors) {
		const nuMsg = nuMessages[r.file] ?? '';
		let cat: string;
		if (nuMsg.startsWith('Bad value')) {
			cat = 'Bad value (attribute value type validation)';
		} else if (nuMsg.includes('not allowed on element')) {
			cat = 'Attribute not allowed on element';
		} else if (nuMsg.includes('must not')) {
			cat = 'Must-not constraint';
		} else if (nuMsg.includes('Forbidden code point')) {
			cat = 'Forbidden code point';
		} else if (nuMsg.includes('Stray')) {
			cat = 'Stray element';
		} else if (nuMsg) {
			cat = 'Other';
		} else {
			cat = 'No message in messages.json';
		}
		(msgCategories[cat] ??= []).push(r.file);
	}

	lines.push('| Reason | Count | % of Missed |');
	lines.push('|--------|-------|-------------|');
	const sorted = Object.entries(msgCategories).sort((a, b) => b[1].length - a[1].length);
	for (const [reason, files] of sorted) {
		const pct = ((files.length / missedErrors.length) * 100).toFixed(1);
		lines.push(`| ${reason} | ${files.length} | ${pct}% |`);
	}
	lines.push('');

	// ── Parse errors (separate from false positives) ──
	if (parseErrors.length > 0) {
		lines.push(`### Parse Errors (${parseErrors.length} files)\n`);
		lines.push('markuplint failed to parse these valid files (parser limitation).\n');
		for (const r of parseErrors) {
			const msg = r.violations.map(v => v.message).join('; ');
			lines.push(`- \`${r.file}\`: ${msg}`);
		}
		lines.push('');
	}

	// ── False positives ──
	lines.push(`### False Positives (${falsePositives.length} files)\n`);
	lines.push('markuplint reported violations on files nu-validator considers valid.\n');

	const fpByRule: Record<string, string[]> = {};
	for (const r of falsePositives) {
		for (const v of r.violations) {
			(fpByRule[v.ruleId] ??= []).push(`${r.file} — ${v.message}`);
		}
	}

	for (const [ruleId, entries] of Object.entries(fpByRule).sort((a, b) => b[1].length - a[1].length)) {
		lines.push(`#### ${ruleId} (${entries.length} violations)\n`);
		for (const entry of entries) {
			lines.push(`- ${entry}`);
		}
		lines.push('');
	}

	// ── Content Model detail ──
	const cmCat = categories.find(c => c.name === 'Content Model');
	if (cmCat) {
		const cmFails = cmCat.results.filter(r => !r.pass);
		if (cmFails.length > 0) {
			lines.push(`### Content Model Failures (${cmFails.length} files)\n`);
			for (const r of cmFails) {
				const nuMsg = nuMessages[r.file] ?? '(no message)';
				const tag = r.expected === 'error' ? 'MISSED' : 'FALSE-POS';
				lines.push(`- **[${tag}]** \`${r.file}\`: ${nuMsg}`);
			}
			lines.push('');
		}
	}

	return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────

async function main() {
	if (!existsSync(path.join(VALIDATOR_TESTS_DIR, 'html'))) {
		console.error('Submodule not found. Run: git submodule update --init tests/external/validator');
		process.exit(1);
	}

	const nuMessages: Record<string, string> = existsSync(MESSAGES_PATH)
		? JSON.parse(readFileSync(MESSAGES_PATH, 'utf-8'))
		: {};

	const elementsDir = path.join(VALIDATOR_TESTS_DIR, 'html/elements');
	const obsoleteDir = path.join(VALIDATOR_TESTS_DIR, 'html/obsolete');
	const assertionsDir = path.join(VALIDATOR_TESTS_DIR, 'html/assertions');
	const attrsDir = path.join(VALIDATOR_TESTS_DIR, 'html/attributes');
	const ariaDir = path.join(VALIDATOR_TESTS_DIR, 'html-aria');
	const datatypesDir = path.join(VALIDATOR_TESTS_DIR, 'html/datatypes');

	console.log('Running nu-html-checker compatibility tests...\n');

	const categories: CategoryReport[] = [];
	let done = 0;
	const totalSteps = 9;

	// 1. Content Model (all rules to catch cross-rule errors)
	const modelFiles = collectTestableHtmlFiles(elementsDir).filter(f => path.basename(f).startsWith('model-'));
	process.stdout.write(`[1/${totalSteps}] Content Model (${modelFiles.length} files)...`);
	categories.push(await runCategory('Content Model', modelFiles, allRulesConfig));
	done += modelFiles.length;
	console.log(` done (${done} total)`);

	// 2. Deprecated Elements
	const obsoleteFiles = collectTestableHtmlFiles(obsoleteDir).filter(
		f => getExpectedResult(path.basename(f)) === 'error',
	);
	process.stdout.write(`[2/${totalSteps}] Deprecated Elements (${obsoleteFiles.length} files)...`);
	categories.push(await runCategory('Deprecated Elements', obsoleteFiles, { rules: { 'deprecated-element': true } }));
	done += obsoleteFiles.length;
	console.log(` done (${done} total)`);

	// 3. Required Attributes
	const requiredAttrFiles = collectTestableHtmlFiles(assertionsDir).filter(f => {
		const b = path.basename(f);
		return b.includes('missing') && b.includes('-novalid');
	});
	process.stdout.write(`[3/${totalSteps}] Required Attributes (${requiredAttrFiles.length} files)...`);
	categories.push(await runCategory('Required Attributes', requiredAttrFiles, { rules: { 'required-attr': true } }));
	done += requiredAttrFiles.length;
	console.log(` done (${done} total)`);

	// 4. Invalid Attributes (per-element, novalid + isvalid, excluding model-*)
	const elemAttrFiles = collectTestableHtmlFiles(elementsDir).filter(f => {
		const b = path.basename(f);
		return (b.includes('-novalid') || b.includes('-isvalid')) && !b.startsWith('model-');
	});
	process.stdout.write(`[4/${totalSteps}] Invalid Attributes (${elemAttrFiles.length} files)...`);
	categories.push(await runCategory('Invalid Attributes', elemAttrFiles, allRulesConfig));
	done += elemAttrFiles.length;
	console.log(` done (${done} total)`);

	// 5. Global Attributes
	const globalAttrFiles = collectTestableHtmlFiles(attrsDir);
	process.stdout.write(`[5/${totalSteps}] Global Attributes (${globalAttrFiles.length} files)...`);
	categories.push(await runCategory('Global Attributes', globalAttrFiles, allRulesConfig));
	done += globalAttrFiles.length;
	console.log(` done (${done} total)`);

	// 6. ID Duplication
	const idFiles = collectTestableHtmlFiles(assertionsDir).filter(f =>
		path.basename(f).toLowerCase().includes('duplicate-id') && getExpectedResult(path.basename(f)) === 'error',
	);
	process.stdout.write(`[6/${totalSteps}] ID Duplication (${idFiles.length} files)...`);
	categories.push(await runCategory('ID Duplication', idFiles, { rules: { 'id-duplication': true } }));
	done += idFiles.length;
	console.log(` done (${done} total)`);

	// 7. ARIA
	const ariaFiles = collectTestableHtmlFiles(ariaDir);
	process.stdout.write(`[7/${totalSteps}] ARIA (${ariaFiles.length} files)...`);
	categories.push(await runCategory('ARIA', ariaFiles, allRulesConfig));
	done += ariaFiles.length;
	console.log(` done (${done} total)`);

	// 8. Assertions (all, excluding already-covered missing-* and duplicate-id)
	const coveredAssertions = new Set([...requiredAttrFiles, ...idFiles].map(f => f));
	const otherAssertionFiles = collectTestableHtmlFiles(assertionsDir).filter(f => !coveredAssertions.has(f));
	process.stdout.write(`[8/${totalSteps}] Assertions (${otherAssertionFiles.length} files)...`);
	categories.push(await runCategory('Assertions', otherAssertionFiles, allRulesConfig));
	done += otherAssertionFiles.length;
	console.log(` done (${done} total)`);

	// 9. Data Types
	const datatypeFiles = collectTestableHtmlFiles(datatypesDir);
	process.stdout.write(`[9/${totalSteps}] Data Types (${datatypeFiles.length} files)...`);
	categories.push(await runCategory('Data Types', datatypeFiles, allRulesConfig));
	done += datatypeFiles.length;
	console.log(` done (${done} total)`);

	// Generate report
	const report = formatReport(categories, nuMessages);

	const outPath = path.resolve(__dirname, 'nu-validator-report.md');
	writeFileSync(outPath, report);
	console.log(`\nReport written to: ${outPath}`);

	// Also print summary to stdout
	const totalPass = categories.reduce((s, c) => s + c.results.filter(r => r.pass).length, 0);
	const totalAll = categories.reduce((s, c) => s + c.results.length, 0);
	console.log(`\n  Pass: ${totalPass} / ${totalAll} (${((totalPass / totalAll) * 100).toFixed(1)}%)`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
