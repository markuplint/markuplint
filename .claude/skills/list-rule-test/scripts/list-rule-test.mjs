#!/usr/bin/env node

/**
 * List the test IDs of the rule specs: the behavior tests of the registered rules, which are the tests that
 * carry a `[<rule-name>-NNN]` ID (`packages/@markuplint/rules/CLAUDE.md`). A behavior test is a `test()` /
 * `test.each()` of a spec in a registered rule's directory (one that `src/index.ts` imports) that goes through
 * the testing API (`mlRuleTest`, `mlTest`, `mlTestFile`). The tests of any other spec have no ID and are not
 * listed.
 *
 * Usage:
 *   node .claude/skills/list-rule-test/scripts/list-rule-test.mjs [options]
 *
 * Options:
 *   --rule <name>   Only the tests of this rule (e.g., --rule label-has-control)
 *   --next <name>   Print the ID to give the next test of this rule: the highest number of the rule plus one
 *   --no-id         Only the behavior tests that have no ID (the convention requires one)
 *   --stats         Show summary statistics
 *   --json          Output as JSON
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';

const RULES_DIR = 'packages/@markuplint/rules/src';
const TESTING_API = new Set(['mlRuleTest', 'mlTest', 'mlTestFile']);

function findSpecFiles(dir) {
	const results = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) results.push(...findSpecFiles(full));
		else if (entry.name.endsWith('.spec.ts')) results.push(full);
	}
	return results.sort();
}

function registeredRules() {
	const index = readFileSync(join(RULES_DIR, 'index.ts'), 'utf8');
	return new Set([...index.matchAll(/from '\.\/([^/']+)\/index\.js'/g)].map(match => match[1]));
}

/** The text that a name starts with, as far as the source tells. */
function leadingText(node) {
	if (ts.isStringLiteralLike(node)) return node.text;
	if (ts.isTemplateExpression(node)) return node.head.text;
	if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return leadingText(node.left);
	if (ts.isParenthesizedExpression(node)) return leadingText(node.expression);
	return undefined;
}

function isTestCall(call) {
	let expression = call.expression;
	while (ts.isCallExpression(expression) || ts.isTaggedTemplateExpression(expression)) {
		expression = ts.isCallExpression(expression) ? expression.expression : expression.tag;
	}
	while (ts.isPropertyAccessExpression(expression)) expression = expression.expression;
	return ts.isIdentifier(expression) && (expression.text === 'test' || expression.text === 'it');
}

/** The tests of a behavior spec, or none for any other spec. */
function parseBehaviorTests(filePath, rules) {
	const [rule, ...rest] = relative(RULES_DIR, filePath).split('/');
	if (rest.length === 0 || !rules.has(rule)) return [];
	const sourceFile = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);
	let usesTestingApi = false;
	const results = [];
	const visit = node => {
		if (ts.isImportDeclaration(node)) {
			const bindings = node.importClause?.namedBindings;
			if (bindings && ts.isNamedImports(bindings)) {
				usesTestingApi ||= bindings.elements.some(element => TESTING_API.has((element.propertyName ?? element.name).text));
			}
		}
		if (ts.isCallExpression(node) && isTestCall(node) && node.arguments[0] && node.arguments.some(a => ts.isFunctionLike(a))) {
			const fullName = leadingText(node.arguments[0]) ?? '';
			const idMatch = fullName.match(/^\[([^\]]+)\]\s*(.*)/s);
			results.push({
				file: relative('.', filePath),
				line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
				rule,
				id: idMatch ? idMatch[1] : null,
				name: idMatch ? idMatch[2] : fullName,
			});
		}
		ts.forEachChild(node, visit);
	};
	visit(sourceFile);
	return usesTestingApi ? results : [];
}

// Parse args
const args = process.argv.slice(2);
const valueOf = flag => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
const filterRule = valueOf('--rule');
const nextRule = valueOf('--next');
const showNoId = args.includes('--no-id');
const showStats = args.includes('--stats');
const outputJson = args.includes('--json');

// Collect
const rules = registeredRules();
let allTests = findSpecFiles(RULES_DIR).flatMap(file => parseBehaviorTests(file, rules));

if (nextRule) {
	if (!rules.has(nextRule)) {
		console.error(`${nextRule} is not a registered rule (a directory that ${RULES_DIR}/index.ts imports)`);
		process.exit(1);
	}
	const numbers = allTests
		.filter(t => t.rule === nextRule && t.id)
		.map(t => new RegExp(`^${nextRule}-(\\d+)$`).exec(t.id)?.[1])
		.filter(Boolean)
		.map(Number);
	console.log(`[${nextRule}-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}]`);
	process.exit(0);
}

// Filter
if (filterRule) allTests = allTests.filter(t => t.rule === filterRule);
if (showNoId) allTests = allTests.filter(t => !t.id);

// Output
if (showStats) {
	const byRule = {};
	let withId = 0;
	let withoutId = 0;
	for (const t of allTests) {
		byRule[t.rule] = (byRule[t.rule] || 0) + 1;
		if (t.id) withId++;
		else withoutId++;
	}
	console.log(`Behavior tests: ${allTests.length} (with ID: ${withId}, without ID: ${withoutId})\n`);
	console.log('By rule:');
	for (const [rule, count] of Object.entries(byRule).sort((a, b) => a[0].localeCompare(b[0]))) {
		console.log(`  ${rule}: ${count}`);
	}
} else if (outputJson) {
	console.log(JSON.stringify(allTests, null, 2));
} else {
	for (const t of allTests) {
		console.log(`${t.id || '(no-id)'}\t${t.file}:${t.line}\t${t.name}`);
	}
}
