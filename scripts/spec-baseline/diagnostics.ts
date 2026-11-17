/**
 * What the rules say about a document, recorded in full, so that a change to how the spec is read
 * can be seen to change nothing (or to change exactly what it was meant to).
 *
 * The record has two parts, both taken from one run of the engine:
 *
 * - the violations of every rule of `@markuplint/rules`, each with every field it has: the rule, the
 *   severity, the position, the offending node (`raw`), the message with what it expected, the
 *   reason and the fix. Every rule is enabled, not only those known to read the spec: which
 *   rule reads which part of the spec is not something the code states, and a rule that reads none
 *   costs nothing but a line in a record that fails when it changes.
 * - the content categories that each element belongs to, from the same selector engine that
 *   `:model()` goes through in the rules. A category is a predicate on the element, not a set of
 *   names (`a[href]` is interactive, `a` is not), so it is asked of each element in the
 *   document and not read off the spec.
 *
 * The spec can be replaced for a run (`transformSpec`): the engine tells the spec it resolved to
 * a listener of `schemas` just before it uses it, and the listener may put another in its place.
 * That is how a spec that a reader produces, or a spec with one field changed (`mutation.ts`),
 * is run through exactly the code that runs for a user.
 *
 * The records are files (`fixtures/expected/`), written by `toMatchFileSnapshot` of `diagnostics.spec.ts`. A change of
 * a rule, of a message or of the data that alters what a rule says about an input fails that spec, and the change is
 * accepted by writing the records again: `npx vitest run scripts/spec-baseline/diagnostics -u`, then reading the diff
 * of the records, which is the list of what changed. The generated inputs (`fixtures/inputs/generated-*.html`) are not
 * written by the spec: `yarn spec-baseline coverage` writes them (`coverage.ts`).
 *
 * @module
 */
import type { MLMLSpec } from '@markuplint/ml-spec';

import { createRule, MLRule } from '@markuplint/ml-core';
import rules from '@markuplint/rules';
import { MLEngine } from 'markuplint';

import { compareText } from './fixtures.ts';

/** The rule that reports the categories of each element. Its name cannot be a rule of the package. */
const CATEGORIES_RULE = 'spec-baseline-categories';

/** One violation, with every field and the keys in a fixed order. */
export type RecordedViolation = Readonly<Record<string, unknown>>;

/** One element and the categories it belongs to. */
export interface RecordedElement {
	readonly line: number;
	readonly col: number;
	readonly raw: string;
	readonly categories: readonly string[];
}

/** What is recorded for a document. */
export interface Diagnosis {
	readonly violations: readonly RecordedViolation[];
	readonly elements: readonly RecordedElement[];
}

/** How a run is set up. */
export interface DiagnoseOptions {
	/** Puts another spec in place of the one the engine resolved. */
	readonly transformSpec?: (spec: MLMLSpec) => MLMLSpec;
	/** The path of an extended spec to apply to the document, as `specs` of a configuration. */
	readonly extendedSpec?: string;
}

/**
 * The names of the rules that are enabled for a record.
 *
 * @returns Every rule of the package, by name
 */
export function allRuleNames(): string[] {
	return Object.keys(rules).toSorted();
}

function categoriesRule() {
	return new MLRule<any, any>({
		name: CATEGORIES_RULE,
		...createRule<boolean>({
			async verify({ document, report }) {
				const categories = Object.keys(document.specs.def['#contentModels']).toSorted();
				await document.walkOn('Element', el => {
					const names = categories.filter(category => el.matches(`:model(${category.replace(/^#/, '')})`));
					report({ scope: el, message: names.join(' ') });
				});
			},
		}),
	});
}

function sortKeys(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(item => sortKeys(item));
	}
	if (typeof value === 'object' && value !== null) {
		return Object.fromEntries(
			Object.entries(value)
				.toSorted(([a], [b]) => compareText(a, b))
				.map(([key, item]) => [key, sortKeys(item)]),
		);
	}
	return value;
}

/**
 * Lints a document with every rule and records the result.
 *
 * @param html - The document
 * @param options - How the run is set up
 * @returns The violations and the categories of each element, in the order of the document
 */
export async function diagnose(html: string, options: DiagnoseOptions = {}): Promise<Diagnosis> {
	const engine = await MLEngine.fromCode(html, {
		name: 'fixture.html',
		config: {
			rules: { ...Object.fromEntries(allRuleNames().map(name => [name, true])), [CATEGORIES_RULE]: true },
			...(options.extendedSpec ? { specs: { '\\.html$': options.extendedSpec } } : {}),
		},
		locale: 'en',
		ignoreExt: true,
	});
	// The rules of a run are the package's own (the engine takes no rule from a caller), and what the engine
	// resolved is a copy for this run: the rule that records the categories is put among them as the spec is
	// put in place of the resolved one below.
	engine.on('rules', (_path, resolved) => {
		(resolved as unknown as MLRule<any, any>[]).push(categoriesRule());
	});
	const { transformSpec } = options;
	if (transformSpec) {
		engine.on('schemas', (_path, schemas) => {
			(schemas as unknown as MLMLSpec[])[0] = transformSpec(schemas[0]);
		});
	}
	const result = await engine.exec();
	if (!result) {
		// `exec()` gives nothing for a file that is not linted; a record of nothing would be taken for a clean document
		throw new Error('The engine gave no result for the document');
	}
	const all = result.violations;
	return {
		violations: all
			.filter(violation => violation.ruleId !== CATEGORIES_RULE)
			.map(violation => sortKeys(violation) as RecordedViolation)
			.toSorted(compareViolations),
		elements: all
			.filter(violation => violation.ruleId === CATEGORIES_RULE)
			.map(violation => ({
				line: violation.line,
				col: violation.col,
				raw: violation.raw,
				categories: violation.message === '' ? [] : violation.message.split(' '),
			}))
			.toSorted((a, b) => a.line - b.line || a.col - b.col),
	};
}

function compareViolations(a: RecordedViolation, b: RecordedViolation): number {
	return (
		Number(a.line) - Number(b.line) ||
		Number(a.col) - Number(b.col) ||
		compareText(String(a.ruleId), String(b.ruleId)) ||
		compareText(String(a.message), String(b.message))
	);
}

/**
 * Whether a violation is the report of a rule that threw. The engine puts it at the top of the file (line 0, column 0)
 * with the error as the message, under the rule that threw, or under `@markuplint/ml-core` for an error of the parser or
 * of the mapping of nodes: a record in which one is has lost everything that the other rules would have said.
 *
 * @param violation - A violation of a run
 * @returns `true` for the report of an error
 */
export function isCrash(violation: RecordedViolation): boolean {
	return (
		violation.ruleId === '@markuplint/ml-core' ||
		(violation.line === 0 && violation.col === 0 && /^[A-Za-z]*Error\b/.test(String(violation.message)))
	);
}

/**
 * Writes a record as text: one JSON object for each line, so that a change is a changed line in a
 * diff and a file is not reformatted by a formatter that does not know it.
 *
 * @param lines - The violations or the elements
 * @returns The text, ending with a newline unless it is empty
 */
export function toLines(lines: readonly unknown[]): string {
	return lines.map(line => `${JSON.stringify(line)}\n`).join('');
}
