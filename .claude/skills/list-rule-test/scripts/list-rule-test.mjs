#!/usr/bin/env node

/**
 * List the test IDs of the rule specs: the behavior tests of the registered rules, which are the tests that
 * carry a `[<rule-name>-NNN]` ID (`packages/@markuplint/rules/CLAUDE.md`). A behavior test is a `test()` /
 * `test.each()` of a spec in a registered rule's directory (one that `src/index.ts` imports) that goes through
 * the testing API (`mlRuleTest`, `mlTest`, `mlTestFile`). The tests of any other spec have no ID and are not
 * listed.
 *
 * What a behavior test is, and the registry, are read as `src/test-ids.spec.ts` of the rules reads them (it is
 * the one that `yarn test` runs, and it asserts that the registry it reads is the set of the rule directories):
 * keep the two in step.
 *
 * Usage, from any directory:
 *   node .claude/skills/list-rule-test/scripts/list-rule-test.mjs [options]
 *
 * Options:
 *   --rule <name>   Only the tests of this rule (e.g., --rule label-has-control)
 *   --next <name>   Print the ID to give the next test of this rule: the highest number present plus one. A
 *                   number that a removed test had and no test has now is not known to it: when the removed
 *                   test had the highest number, take the number after it from the history of the file.
 *   --no-id         Only the behavior tests that have no ID of their rule (`[<rule-name>-NNN]`, three digits
 *                   or more); exits with 1 when there is one
 *   --stats         Show summary statistics
 *   --json          Output as JSON
 *
 * An option that is not listed, or one of `--rule` and `--next` without a value, is an error.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import ts from 'typescript';

// The script is at `.claude/skills/list-rule-test/scripts/`: four levels below the root of the repository.
const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const RULES_DIR = join(ROOT, 'packages/@markuplint/rules/src');
const TESTING_API = new Set(['mlRuleTest', 'mlTest', 'mlTestFile']);

function toPosix(path) {
	return path.split(sep).join('/');
}

function escapeRegExp(text) {
	return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

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

/** `test`, `it` and their members; whether the call is `.todo(...)`, which has no callback. */
function testCall(call) {
	let expression = call.expression;
	while (ts.isCallExpression(expression) || ts.isTaggedTemplateExpression(expression)) {
		expression = ts.isCallExpression(expression) ? expression.expression : expression.tag;
	}
	let todo = false;
	while (ts.isPropertyAccessExpression(expression)) {
		todo ||= expression.name.text === 'todo';
		expression = expression.expression;
	}
	return ts.isIdentifier(expression) && (expression.text === 'test' || expression.text === 'it') ? { todo } : undefined;
}

/** The tests of a behavior spec, or none for any other spec. */
function parseBehaviorTests(filePath, rules) {
	const [rule, ...rest] = toPosix(relative(RULES_DIR, filePath)).split('/');
	if (rest.length === 0 || !rules.has(rule)) return [];
	const sourceFile = ts.createSourceFile(filePath, readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);
	const idPattern = new RegExp(`^\\[(${escapeRegExp(rule)}-\\d{3,})\\]\\s*(.*)`, 's');
	let usesTestingApi = false;
	const results = [];
	const visit = node => {
		if (ts.isImportDeclaration(node)) {
			const bindings = node.importClause?.namedBindings;
			if (bindings && ts.isNamedImports(bindings)) {
				usesTestingApi ||= bindings.elements.some(element => TESTING_API.has((element.propertyName ?? element.name).text));
			}
		}
		const kind = ts.isCallExpression(node) ? testCall(node) : undefined;
		if (kind && node.arguments[0] && (kind.todo || node.arguments.some(a => ts.isFunctionLike(a)))) {
			const fullName = leadingText(node.arguments[0]) ?? '';
			const idMatch = fullName.match(idPattern);
			results.push({
				file: toPosix(relative(ROOT, filePath)),
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

let values;
try {
	({ values } = parseArgs({
		options: {
			rule: { type: 'string' },
			next: { type: 'string' },
			'no-id': { type: 'boolean' },
			stats: { type: 'boolean' },
			json: { type: 'boolean' },
		},
		strict: true,
		allowPositionals: false,
	}));
} catch (error) {
	console.error(`${error.message}\nOptions: --rule <name>, --next <name>, --no-id, --stats, --json`);
	process.exit(1);
}

// Collect
const rules = registeredRules();
let allTests = findSpecFiles(RULES_DIR).flatMap(file => parseBehaviorTests(file, rules));

if (values.next !== undefined) {
	const nextRule = values.next;
	if (!rules.has(nextRule)) {
		console.error(`${nextRule} is not a registered rule (a directory that packages/@markuplint/rules/src/index.ts imports)`);
		process.exit(1);
	}
	const numberOf = new RegExp(`^${escapeRegExp(nextRule)}-(\\d+)$`);
	const numbers = allTests
		.filter(t => t.rule === nextRule && t.id)
		.map(t => numberOf.exec(t.id)?.[1])
		.filter(Boolean)
		.map(Number);
	console.log(`[${nextRule}-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}]`);
	process.exit(0);
}

// Filter
if (values.rule !== undefined) allTests = allTests.filter(t => t.rule === values.rule);
if (values['no-id']) allTests = allTests.filter(t => !t.id);

// Output
if (values.stats) {
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
} else if (values.json) {
	console.log(JSON.stringify(allTests, null, 2));
} else {
	for (const t of allTests) {
		console.log(`${t.id || '(no-id)'}\t${t.file}:${t.line}\t${t.name}`);
	}
}

// `--no-id` is a check: a test that lacks an ID fails it.
if (values['no-id'] && allTests.length > 0) process.exitCode = 1;
