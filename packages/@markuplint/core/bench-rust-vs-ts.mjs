/**
 * Benchmark: TS Full vs Full Rust→TS
 *
 * Uses real test fixture HTML files that exercise permitted-contents
 * rule complexity: transparent models, conditional content models,
 * backtracking patterns (dl/ruby/table), and foreign content (SVG/MathML).
 *
 * Fixtures are repeated N times to amplify computation cost.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { mlTest } from 'markuplint';

const require_ = createRequire(import.meta.url);
const { lintHtml } = require_('./index.js');
const htmlSpec = require_('@markuplint/html-spec');
const specJson = JSON.stringify(htmlSpec);
const configJson = JSON.stringify({ rules: { 'permitted-contents': true } });
const tsConfig = { rules: { 'permitted-contents': true } };

const FIXTURE_DIR = new URL('../../../test/fixture/', import.meta.url).pathname;

// ============================================================
// Fixture loader: read file, optionally repeat body N times
// ============================================================

function loadFixture(filename) {
	return readFileSync(FIXTURE_DIR + filename, 'utf8');
}

function repeatBody(html, n) {
	const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
	if (!bodyMatch) {
		// Fragment: repeat the whole thing
		return Array.from({ length: n }, () => html).join('\n');
	}
	const before = html.slice(0, bodyMatch.index + bodyMatch[0].indexOf(bodyMatch[1]));
	const body = bodyMatch[1];
	const after = html.slice(bodyMatch.index + bodyMatch[0].indexOf(bodyMatch[1]) + bodyMatch[1].length);
	return before + Array.from({ length: n }, () => body).join('\n') + after;
}

// ============================================================
// Fixtures
// ============================================================

function combineFixtures(filenames, repeat) {
	const bodies = filenames.map(f => {
		const h = loadFixture(f);
		const m = h.match(/<body[^>]*>([\s\S]*)<\/body>/i);
		return m ? m[1] : h;
	});
	const combined = bodies.join('\n');
	return `<!DOCTYPE html><html><head><title>T</title></head><body>${Array.from({ length: repeat }, () => combined).join('\n')}</body></html>`;
}

const fixtures = [
	{
		name: '005.html ×1 (transparent + conditional + dl + table)',
		html: loadFixture('005.html'),
	},
	{
		name: '005.html ×10',
		html: repeatBody(loadFixture('005.html'), 10),
	},
	{
		name: '005.html ×50',
		html: repeatBody(loadFixture('005.html'), 50),
	},
	{
		name: '011.html ×1 (ruby sequences)',
		html: loadFixture('011.html'),
	},
	{
		name: '011.html ×5',
		html: repeatBody(loadFixture('011.html'), 5),
	},
	{
		name: '011.html ×20',
		html: repeatBody(loadFixture('011.html'), 20),
	},
	{
		name: '023.html ×1 (complex table with colspan/rowspan)',
		html: loadFixture('023.html'),
	},
	{
		name: '023.html ×5',
		html: repeatBody(loadFixture('023.html'), 5),
	},
	{
		name: '023.html ×20',
		html: repeatBody(loadFixture('023.html'), 20),
	},
	{
		name: 'All fixtures combined ×1',
		html: combineFixtures(['005.html', '011.html', '023.html'], 1),
	},
	{
		name: 'All fixtures combined ×5',
		html: combineFixtures(['005.html', '011.html', '023.html'], 5),
	},
];

// ============================================================
// Benchmark Runner
// ============================================================

const WARMUP = 3;
const RUNS = 10;

function median(arr) {
	const sorted = arr.toSorted((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function benchTsFull(html) {
	const times = [];
	let violationCount = 0;

	for (let i = 0; i < WARMUP + RUNS; i++) {
		const t0 = performance.now();
		const { violations } = await mlTest(html, tsConfig);
		const t1 = performance.now();

		if (i >= WARMUP) {
			times.push(t1 - t0);
			violationCount = violations.filter(v => v.ruleId === 'permitted-contents').length;
		}
	}

	return {
		total: median(times),
		min: Math.min(...times),
		max: Math.max(...times),
		violationCount,
	};
}

function benchFullRust(html) {
	const times = [];
	let violationCount = 0;

	for (let i = 0; i < WARMUP + RUNS; i++) {
		const t0 = performance.now();
		const violations = lintHtml(html, configJson, specJson);
		const t1 = performance.now();

		if (i >= WARMUP) {
			times.push(t1 - t0);
			violationCount = violations.filter(v => v.ruleId === 'permitted-contents').length;
		}
	}

	return {
		total: median(times),
		min: Math.min(...times),
		max: Math.max(...times),
		violationCount,
	};
}

// ============================================================
// Run
// ============================================================

/* eslint-disable no-console */
console.log('=== markuplint Benchmark: TS Full vs Full Rust ===');
console.log('=== Using real test fixture HTML files ===\n');
console.log(`Warmup: ${WARMUP} runs, Measurement: ${RUNS} runs\n`);

for (const { name, html } of fixtures) {
	const size = (html.length / 1024).toFixed(1);
	console.log(`--- ${name} (${size} KB) ---`);

	const ts = await benchTsFull(html);
	const rust = benchFullRust(html);

	console.log(
		`  TS Full:    ${ts.total.toFixed(2)} ms  [${ts.min.toFixed(2)} - ${ts.max.toFixed(2)}]  violations: ${ts.violationCount}`,
	);
	console.log(
		`  Full Rust:  ${rust.total.toFixed(2)} ms  [${rust.min.toFixed(2)} - ${rust.max.toFixed(2)}]  violations: ${rust.violationCount}`,
	);
	console.log(`  Speedup: ${(ts.total / rust.total).toFixed(2)}x`);
	if (ts.violationCount !== rust.violationCount) {
		console.log(`  ⚠ VIOLATION MISMATCH: TS=${ts.violationCount} Rust=${rust.violationCount}`);
	}
	console.log('');
}
