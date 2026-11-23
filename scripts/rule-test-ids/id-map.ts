/**
 * The shape of `id-map.json`, checked when it is read: the verifier takes a key it does not know, or an entry
 * with a field missing, for no entry at all, and a removal that is silently dropped is the loss that the
 * verifier exists to catch.
 *
 * `removed` and `added` are the entries that the verifier checks against the base it is given. `merged` keeps
 * the entries of such a list once its base contains them, in the same shape: they are no longer true against
 * that base, and the v6 line ports its IDs from them. The ID of a removed test is not given to another test,
 * as the v6 line would take the new one for the old: a new test takes the highest number of its file or rule
 * plus one.
 *
 * `renamed` and `unnumbered` are written by `renumber.ts` (which says what they are for) and are not checked by
 * the verifier.
 *
 * `policy` lists specs under the rules' `src` that enforce the convention that the reorganization
 * establishes (a spec about the specs, with no counterpart in the base): the verifier leaves their tests and
 * cases out of the head, as it would report each as a test that appeared. It is true only against a base that
 * predates them, like `removed` and `added`, so it is emptied when the base contains them.
 *
 * @module
 */
import type { Addition, Removal } from './compare.ts';

/** An ID of the base and the new one of the test that took its place. `file` is a path from the root of the repository. */
export interface Renamed {
	readonly file: string;
	readonly id: string;
	readonly to: string;
}

/** An ID of the base whose test has none now. `file` is a path from the root of the repository. */
export interface Unnumbered {
	readonly file: string;
	readonly id: string;
}

export interface IdMap {
	readonly removed: readonly Removal[];
	readonly added: readonly Addition[];
	/** Paths relative to the rules' `src`. */
	readonly policy?: readonly string[];
	readonly renamed?: readonly Renamed[];
	readonly unnumbered?: readonly Unnumbered[];
	readonly merged?: { readonly removed: readonly Removal[]; readonly added: readonly Addition[] };
}

const KNOWN_KEYS = ['removed', 'added', 'policy', 'renamed', 'unnumbered', 'merged'];
const REMOVAL_FIELDS = ['file', 'id', 'keptIn', 'keptId'];
const ADDITION_FIELDS = ['file', 'id'];
const RENAMED_FIELDS = ['file', 'id', 'to'];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function entries<T>(value: unknown, where: string, fields: readonly string[]): T[] {
	if (value === undefined) {
		return [];
	}
	if (!Array.isArray(value)) {
		throw new TypeError(`id-map: ${where} must be an array`);
	}
	return value.map((entry: unknown, index) => {
		const exact =
			isRecord(entry) &&
			Object.keys(entry).length === fields.length &&
			fields.every(field => typeof entry[field] === 'string');
		if (!exact) {
			throw new TypeError(`id-map: ${where}[${index}] must have exactly the string fields ${fields.join(', ')}`);
		}
		return entry as T;
	});
}

/**
 * @param text - The text of `id-map.json`
 * @returns The map, with a list that is absent taken as empty
 * @throws When the text is not an object of the shape above
 */
export function parseIdMap(text: string): IdMap {
	const value: unknown = JSON.parse(text);
	if (!isRecord(value)) {
		throw new TypeError('id-map: the file must hold an object');
	}
	for (const key of Object.keys(value)) {
		if (!KNOWN_KEYS.includes(key)) {
			throw new TypeError(`id-map: unknown key "${key}" (known: ${KNOWN_KEYS.join(', ')})`);
		}
	}
	const merged = value.merged;
	if (merged !== undefined && !isRecord(merged)) {
		throw new TypeError('id-map: merged must be an object');
	}
	const policy = value.policy;
	if (policy !== undefined && !(Array.isArray(policy) && policy.every(item => typeof item === 'string'))) {
		throw new TypeError('id-map: policy must be an array of strings');
	}
	// A path that is not in the form that the verifier compares (`/`, relative to `src`) would be ignored without a word.
	const malformed = (policy as string[] | undefined)?.find(
		file => !file.endsWith('.spec.ts') || file.includes('\\') || file.startsWith('./') || file.startsWith('/'),
	);
	if (malformed !== undefined) {
		throw new TypeError(
			`id-map: policy "${malformed}" must be a *.spec.ts path with \`/\`, relative to the rules' src`,
		);
	}
	return {
		removed: entries<Removal>(value.removed, 'removed', REMOVAL_FIELDS),
		added: entries<Addition>(value.added, 'added', ADDITION_FIELDS),
		...(policy ? { policy: policy as string[] } : {}),
		...(value.renamed === undefined ? {} : { renamed: entries<Renamed>(value.renamed, 'renamed', RENAMED_FIELDS) }),
		...(value.unnumbered === undefined
			? {}
			: { unnumbered: entries<Unnumbered>(value.unnumbered, 'unnumbered', ADDITION_FIELDS) }),
		...(merged
			? {
					merged: {
						removed: entries<Removal>(merged.removed, 'merged.removed', REMOVAL_FIELDS),
						added: entries<Addition>(merged.added, 'merged.added', ADDITION_FIELDS),
					},
				}
			: {}),
	};
}
