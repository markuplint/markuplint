/**
 * The cases that ran, counted rule by rule against a base: what the fingerprints of `fingerprint.ts` cannot say.
 *
 * @module
 */
import type { Addition, Removal } from './compare.ts';

import { idOf, scopeOf } from './compare.ts';

/**
 * The part of the JSON reporter of vitest (`vitest run --reporter=json`) that is read: one entry per spec,
 * one `assertionResults` entry per case, a `test.each` row being a case of its own.
 */
export interface CaseReport {
	readonly testResults: readonly {
		/** Absolute path of the spec. */
		readonly name: string;
		readonly assertionResults: readonly { readonly title: string; readonly status: string }[];
	}[];
}

/**
 * The part of a path that the two checkouts of a comparison share: the reports are made in a checkout of the
 * base and in the working tree, so the same spec has a different absolute path in each.
 */
const SRC_MARKER = 'packages/@markuplint/rules/src/';

/**
 * @param name - Absolute path of a spec as a report gives it
 * @returns Its path relative to the rules' `src` with `/`, or undefined when it is not under it
 */
function relativeToSrc(name: string): string | undefined {
	const normalized = name.replaceAll('\\', '/');
	const at = normalized.indexOf(SRC_MARKER);
	return at === -1 ? undefined : normalized.slice(at + SRC_MARKER.length);
}

/**
 * Compares how many cases ran in each rule, and that every one of them passed.
 *
 * The fingerprints say that each test is still there as it was; this says that each test still runs, which a
 * `describe` that no longer collects its tests, a loop that iterates nothing, a helper that is called fewer
 * times, or a `test.each` whose table got shorter would not show. A removal in the ID map takes off the cases
 * of the test it names, and an addition puts on the cases of the test it names: the cases are the ones whose
 * title has exactly that ID, so every row of a `test.each` counts. The count is per rule, not per test: a case
 * lost in a rule and a case gained in the same rule cancel out here, which the fingerprints show.
 *
 * @param base - The report of the version to compare with
 * @param head - The report of the version being checked
 * @param removed - The removals that the head makes on purpose, as in the ID map
 * @param added - The additions that the head makes on purpose, as in the ID map
 * @returns What does not add up, one line each; empty when it all does
 */
export function compareCases(
	base: CaseReport,
	head: CaseReport,
	removed: readonly Removal[],
	added: readonly Addition[],
): string[] {
	const problems: string[] = [];
	const expected = new Map<string, number>();
	const actual = new Map<string, number>();
	const specs = (report: CaseReport) =>
		report.testResults.flatMap(result => {
			const file = relativeToSrc(result.name);
			if (file === undefined) {
				problems.push(`${result.name} is not under ${SRC_MARKER}, so it belongs to no rule`);
				return [];
			}
			return [{ file, cases: result.assertionResults }];
		});
	const baseSpecs = specs(base);
	const headSpecs = specs(head);

	for (const spec of baseSpecs) {
		const scope = scopeOf(spec.file);
		expected.set(scope, (expected.get(scope) ?? 0) + spec.cases.length);
	}
	for (const removal of removed) {
		const spec = baseSpecs.find(candidate => candidate.file === removal.file);
		const cases = spec?.cases.filter(c => idOf(c.title) === removal.id).length ?? 0;
		if (cases === 0) {
			problems.push(
				`${removal.file} [${removal.id}] is recorded as removed, but no case of the base report has that ID`,
			);
			continue;
		}
		const scope = scopeOf(removal.file);
		expected.set(scope, (expected.get(scope) ?? 0) - cases);
	}

	for (const addition of added) {
		const spec = headSpecs.find(candidate => candidate.file === addition.file);
		const cases = spec?.cases.filter(c => idOf(c.title) === addition.id).length ?? 0;
		if (cases === 0) {
			problems.push(
				`${addition.file} [${addition.id}] is recorded as added, but no case of the head report has that ID`,
			);
			continue;
		}
		const scope = scopeOf(addition.file);
		expected.set(scope, (expected.get(scope) ?? 0) + cases);
	}

	for (const spec of headSpecs) {
		const scope = scopeOf(spec.file);
		actual.set(scope, (actual.get(scope) ?? 0) + spec.cases.length);
		for (const c of spec.cases) {
			if (c.status !== 'passed') {
				problems.push(`${spec.file}: "${c.title}" is ${c.status}, not passed`);
			}
		}
	}

	for (const scope of new Set([...expected.keys(), ...actual.keys()])) {
		const want = expected.get(scope) ?? 0;
		const got = actual.get(scope) ?? 0;
		if (want !== got) {
			problems.push(`${scope}: ${got} cases ran, ${want} were expected from the base`);
		}
	}
	return problems;
}
