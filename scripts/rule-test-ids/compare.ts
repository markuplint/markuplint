/**
 * The comparison of the tests of two versions of the rule specs, by the hash of what each test pins
 * (`fingerprint.ts`): a test that is gone, a test that is new or whose body changed, and an entry of the ID map
 * that the two versions do not bear out.
 *
 * The key of a test is its rule (the directory under `src`, or the file for a spec at the top) and its hash,
 * so a test may move between the files of a rule and may be renamed, and may not move to another rule or
 * change. A duplicate that is removed on purpose is the one thing allowed to disappear: it is recorded in the
 * ID map with the test that stays, and it must be identical to that test and some copy must stay, so a removal
 * cannot be a loss. A test that is added on purpose is recorded the same way, and must be one that the base does
 * not have. An entry is recorded once.
 *
 * @module
 */

/** A test of a spec file, with the hash of what it pins (`TestFingerprint`) and where it is. */
export interface Fingerprinted {
	/** The rule that the test belongs to. */
	readonly scope: string;
	/** Path of the spec relative to the rules' `src`. */
	readonly file: string;
	readonly line: number;
	/** The name as written; it begins with the `[id]` of the test while the specs carry one. */
	readonly name: string;
	/** The hash of the test with what runs around it. */
	readonly hash: string;
	/** The hash of the test alone; when both sides have it, the same body in another setting is told from a change. */
	readonly body?: string;
}

/** A test that was removed because another one is the same. Paths and IDs are those of the base. */
export interface Removal {
	readonly file: string;
	readonly id: string;
	/** The file of the test that stays. */
	readonly keptIn: string;
	/** The ID of the test that stays. */
	readonly keptId: string;
}

/** A test that the head adds on purpose, because a behavior had none. Path and ID are those of the head. */
export interface Addition {
	readonly file: string;
	readonly id: string;
}

/**
 * One thing that does not add up.
 *
 * - `vanished` and `appeared`: a test of the base with no counterpart in the head, and the other way round (a
 *   changed body is both).
 * - `context-changed`: such a pair whose test is the same in itself and stands among other hooks, groups, loops
 *   or file-level statements, as when a spec is merged into a file that has a `beforeEach`.
 * - the entries of the ID map that the two versions do not bear out: `duplicate-entry` is one that is listed
 *   twice; `removal-unknown` names no test of the base (or more than one); `removal-not-identical` names a test
 *   that is not the same as the one said to stay; `removal-removes-all` leaves no copy of a test; and
 *   `removal-not-applied` is a removal that the head did not make; `addition-not-applied` names no test of the
 *   head; `addition-not-new` is an addition that the base already had.
 */
export interface Problem {
	readonly kind:
		| 'vanished'
		| 'appeared'
		| 'context-changed'
		| 'duplicate-entry'
		| 'removal-unknown'
		| 'removal-not-identical'
		| 'removal-removes-all'
		| 'removal-not-applied'
		| 'addition-not-applied'
		| 'addition-not-new';
	readonly message: string;
}

/**
 * @param file - Path of a spec relative to the rules' `src`, with `/`
 * @returns The rule it belongs to: its directory, or the file itself for a spec directly under `src`
 */
export function scopeOf(file: string): string {
	const [first, ...rest] = file.split('/');
	return rest.length > 0 && first ? first : file;
}

/**
 * @param name - The name of a test
 * @returns The ID at the start of it: `[rule-valid-001] text` is `rule-valid-001`; none if it has no `[id]`
 */
export function idOf(name: string): string | undefined {
	return /^\[([^\]]+)\]/.exec(name)?.[1];
}

function keyOf(test: Fingerprinted): string {
	return `${test.scope}\u0000${test.hash}`;
}

function describeTest(test: Fingerprinted): string {
	return `${test.file}:${test.line} ${test.name}`;
}

function group(tests: readonly Fingerprinted[]): Map<string, Fingerprinted[]> {
	const map = new Map<string, Fingerprinted[]>();
	for (const test of tests) {
		const key = keyOf(test);
		map.set(key, [...(map.get(key) ?? []), test]);
	}
	return map;
}

function findById(tests: readonly Fingerprinted[], file: string, id: string): Fingerprinted[] {
	return tests.filter(test => test.file === file && idOf(test.name) === id);
}

/** The tests of one key that the two versions do not have the same number of. */
interface Imbalance {
	readonly tests: readonly Fingerprinted[];
	readonly count: number;
	paired?: boolean;
}

/**
 * @param base - The tests of the version to compare with
 * @param head - The tests of the version being checked
 * @param removed - The removals that the head makes on purpose, as in the ID map
 * @param added - The tests that the head adds on purpose, as in the ID map
 * @returns What does not add up; empty when `head` is `base` less the removals and plus the additions, test for test
 */
export function compare(
	base: readonly Fingerprinted[],
	head: readonly Fingerprinted[],
	removed: readonly Removal[],
	added: readonly Addition[],
): Problem[] {
	const problems: Problem[] = [];
	const baseGroups = group(base);
	const headGroups = group(head);
	const removedByKey = new Map<string, number>();
	const addedByKey = new Map<string, number>();
	const seen = new Set<string>();
	const isNew = (kind: string, entry: { file: string; id: string }) => {
		const id = `${kind}\u0000${entry.file}\u0000${entry.id}`;
		if (seen.has(id)) {
			problems.push({
				kind: 'duplicate-entry',
				message: `${entry.file} [${entry.id}] is listed twice as ${kind}`,
			});
			return false;
		}
		seen.add(id);
		return true;
	};

	for (const addition of added) {
		if (!isNew('added', addition)) {
			continue;
		}
		const [test] = findById(head, addition.file, addition.id);
		if (!test) {
			problems.push({
				kind: 'addition-not-applied',
				message: `${addition.file} [${addition.id}] is recorded as added, but the head has no such test`,
			});
		} else if (baseGroups.has(keyOf(test))) {
			problems.push({
				kind: 'addition-not-new',
				message: `${describeTest(test)} is recorded as added, but the base has the same test`,
			});
		} else {
			addedByKey.set(keyOf(test), (addedByKey.get(keyOf(test)) ?? 0) + 1);
		}
	}

	for (const removal of removed) {
		if (!isNew('removed', removal)) {
			continue;
		}
		const found = findById(base, removal.file, removal.id);
		const kept = findById(base, removal.keptIn, removal.keptId);
		const [test] = found;
		if (found.length !== 1 || !test) {
			problems.push({
				kind: 'removal-unknown',
				message: `${removal.file} [${removal.id}] is recorded as removed, but the base has ${found.length} such tests`,
			});
			continue;
		}
		const [stays] = kept;
		if (kept.length !== 1 || !stays || stays === test || keyOf(stays) !== keyOf(test)) {
			problems.push({
				kind: 'removal-not-identical',
				message: `${describeTest(test)} is recorded as the same as ${removal.keptIn} [${removal.keptId}], which is not an identical test`,
			});
			continue;
		}
		removedByKey.set(keyOf(test), (removedByKey.get(keyOf(test)) ?? 0) + 1);
	}

	const lost: Imbalance[] = [];
	const gained: Imbalance[] = [];
	for (const key of new Set([...baseGroups.keys(), ...headGroups.keys()])) {
		const inBase = baseGroups.get(key) ?? [];
		const inHead = headGroups.get(key) ?? [];
		const gone = removedByKey.get(key) ?? 0;
		const expected = inBase.length - gone + (addedByKey.get(key) ?? 0);
		if (gone > 0 && inBase.length - gone < 1) {
			problems.push({
				kind: 'removal-removes-all',
				message: `${inBase.map(describeTest).join(' | ')}: the removals leave no copy of this test`,
			});
		} else if (gone > 0 && inHead.length === inBase.length) {
			problems.push({
				kind: 'removal-not-applied',
				message: `${describeTest(inBase[0]!)} is recorded as removed, but the head has as many of them as the base`,
			});
		} else if (inHead.length < expected) {
			lost.push({ tests: inBase, count: expected - inHead.length });
		} else if (inHead.length > expected) {
			gained.push({ tests: inHead, count: inHead.length - expected });
		}
	}

	for (const lostOne of lost) {
		const [before] = lostOne.tests;
		const twin = gained.find(
			candidate =>
				!candidate.paired &&
				candidate.count === lostOne.count &&
				before?.body !== undefined &&
				candidate.tests[0]?.body === before.body &&
				candidate.tests[0]?.scope === before.scope,
		);
		if (twin) {
			twin.paired = true;
			problems.push({
				kind: 'context-changed',
				message: `${lostOne.tests.map(describeTest).join(' | ')} -> ${twin.tests.map(describeTest).join(' | ')}: the same test among other hooks, groups, loops or statements`,
			});
		} else {
			problems.push({
				kind: 'vanished',
				message: `${lostOne.tests.map(describeTest).join(' | ')}: ${lostOne.count} test(s) of the base have no counterpart in the head`,
			});
		}
	}
	for (const gainedOne of gained) {
		if (!gainedOne.paired) {
			problems.push({
				kind: 'appeared',
				message: `${gainedOne.tests.map(describeTest).join(' | ')}: ${gainedOne.count} test(s) of the head have no counterpart in the base`,
			});
		}
	}
	// `vanished` first, so that a loss is the first thing read; the rest keep the order they were found in.
	const rank = (problem: Problem) => (problem.kind === 'vanished' ? 0 : 1);
	return problems.toSorted((a, b) => rank(a) - rank(b));
}
