/**
 * The shape of `id-map.json`, checked when it is read: the verifier takes a key it does not know, or an entry
 * with a field missing, for no entry at all, and a removal that is silently dropped is the loss that the
 * verifier exists to catch.
 *
 * `removed` and `added` are the entries that the verifier checks against the base it is given. `merged` keeps
 * the entries of a reorganization that has been merged, in the same shape: they are no longer true against the
 * new base, and the v6 line ports its IDs from them. The ID of a removed test is not given to another test, as
 * the v6 line would take the new one for the old: a new test takes the highest number of its file or rule plus
 * one.
 *
 * @module
 */
import type { Addition, Removal } from './compare.ts';

export interface IdMap {
	readonly removed: readonly Removal[];
	readonly added: readonly Addition[];
	readonly merged?: { readonly removed: readonly Removal[]; readonly added: readonly Addition[] };
}

const KNOWN_KEYS = ['removed', 'added', 'merged'];
const REMOVAL_FIELDS = ['file', 'id', 'keptIn', 'keptId'];
const ADDITION_FIELDS = ['file', 'id'];

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
	return {
		removed: entries<Removal>(value.removed, 'removed', REMOVAL_FIELDS),
		added: entries<Addition>(value.added, 'added', ADDITION_FIELDS),
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
