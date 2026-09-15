#!/usr/bin/env node

/**
 * List all test IDs from rule spec files.
 *
 * Usage:
 *   node .claude/skills/list-rule-test/scripts/list-rule-test.mjs [options]
 *
 * Options:
 *   --rule <name>       Filter by rule name (e.g., --rule wai-aria)
 *   --category <name>   Filter by category (e.g., --category issue)
 *   --no-id             Show only tests WITHOUT an ID
 *   --stats             Show summary statistics
 *   --json              Output as JSON
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

const RULES_DIR = 'packages/@markuplint/rules/src';

function findSpecFiles(dir) {
	const results = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) results.push(...findSpecFiles(full));
		else if (entry.name.endsWith('.spec.ts')) results.push(full);
	}
	return results.sort();
}

function getRuleName(filePath) {
	const rel = relative(RULES_DIR, filePath);
	const parts = rel.split('/');
	return parts.length >= 2 ? parts[0] : basename(filePath, '.spec.ts');
}

function parseTestIds(filePath) {
	const content = readFileSync(filePath, 'utf8');
	const lines = content.split('\n');
	const ruleName = getRuleName(filePath);
	const results = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const testMatch =
			line.match(/\btest\(\s*'((?:[^'\\]|\\.)*?)'/) ||
			line.match(/\btest\(\s*"((?:[^"\\]|\\.)*?)"/) ||
			line.match(/\btest\(\s*`((?:[^`\\]|\\.)*?)`/);

		if (!testMatch) continue;

		const fullName = testMatch[1];
		const idMatch = fullName.match(/^\[([\w-]+)\]\s*(.*)/);

		results.push({
			file: relative('.', filePath),
			line: i + 1,
			rule: ruleName,
			id: idMatch ? idMatch[1] : null,
			category: idMatch ? idMatch[1].replace(ruleName + '-', '').replace(/^(issue)-\d+(-\d+)?$/, '$1').replace(/-\d+$/, '') : null,
			name: idMatch ? idMatch[2] : fullName,
		});
	}

	return results;
}

// Parse args
const args = process.argv.slice(2);
const filterRule = args.includes('--rule') ? args[args.indexOf('--rule') + 1] : null;
const filterCategory = args.includes('--category') ? args[args.indexOf('--category') + 1] : null;
const showNoId = args.includes('--no-id');
const showStats = args.includes('--stats');
const outputJson = args.includes('--json');

// Collect
const files = findSpecFiles(RULES_DIR);
let allTests = [];
for (const file of files) {
	allTests.push(...parseTestIds(file));
}

// Filter
if (filterRule) allTests = allTests.filter(t => t.rule === filterRule);
if (filterCategory) allTests = allTests.filter(t => t.category && t.category.startsWith(filterCategory));
if (showNoId) allTests = allTests.filter(t => !t.id);

// Output
if (showStats) {
	const byRule = {};
	const byCategory = {};
	let withId = 0;
	let withoutId = 0;

	for (const t of allTests) {
		byRule[t.rule] = (byRule[t.rule] || 0) + 1;
		if (t.id) {
			withId++;
			const cat = t.category || 'unknown';
			byCategory[cat] = (byCategory[cat] || 0) + 1;
		} else {
			withoutId++;
		}
	}

	console.log(`Total tests: ${allTests.length} (with ID: ${withId}, without ID: ${withoutId})\n`);

	console.log('By category:');
	for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
		console.log(`  ${cat}: ${count}`);
	}

	console.log('\nBy rule:');
	for (const [rule, count] of Object.entries(byRule).sort((a, b) => a[0].localeCompare(b[0]))) {
		console.log(`  ${rule}: ${count}`);
	}
} else if (outputJson) {
	console.log(JSON.stringify(allTests, null, 2));
} else {
	for (const t of allTests) {
		const id = t.id || '(no-id)';
		console.log(`${id}\t${t.file}:${t.line}\t${t.name}`);
	}
}
