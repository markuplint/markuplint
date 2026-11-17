/**
 * What repeats in the spec data, which is what a packed format can take out.
 *
 * Three views of one parsed revision, each answering a question that the design of a format
 * depends on:
 *
 * - {@link stringStats}: how much of the data is strings, and how many of them are the same string
 *   (an intern table's gain).
 * - {@link fieldStats}: for each field, how many bits its values need at best. The zero-order
 *   entropy of the values of one field is the size a dictionary of them could reach with a
 *   perfect code, so it bounds what per-field dictionaries can save; it says nothing of what a
 *   structure shared between fields saves.
 * - {@link dagStats}: how many nodes the tree has against the minimal DAG that shares identical
 *   subtrees (hash-consing). This is the gain of sharing whole substructures, and it excludes
 *   what a grammar-based compressor would take from repeats inside a subtree: such a compressor
 *   (Lohrey, Maneth & Mennicke, "XML tree structure compression using RePair", Information Systems
 *   2013) can be smaller but needs a grammar to be walked to answer a query, which is the cost a
 *   directly queryable layout is meant to avoid.
 *
 * @module
 */
import { compareText } from './fixtures.ts';

/** Counts of the strings of one kind. */
export interface StringStats {
	readonly occurrences: number;
	readonly unique: number;
	/** UTF-8 bytes of every occurrence, without quotes. */
	readonly bytes: number;
	/** UTF-8 bytes of the distinct strings. */
	readonly uniqueBytes: number;
}

/** The strings of a document, object keys and string values apart. */
export interface StringReport {
	readonly keys: StringStats;
	readonly values: StringStats;
}

/**
 * Counts the strings of a document.
 *
 * @param data - A parsed JSON value
 * @returns The statistics for object keys and for string values
 */
export function stringStats(data: unknown): StringReport {
	const keys = new Map<string, number>();
	const values = new Map<string, number>();
	const visit = (value: unknown) => {
		if (typeof value === 'string') {
			values.set(value, (values.get(value) ?? 0) + 1);
		} else if (Array.isArray(value)) {
			for (const item of value) {
				visit(item);
			}
		} else if (typeof value === 'object' && value !== null) {
			for (const [key, item] of Object.entries(value)) {
				keys.set(key, (keys.get(key) ?? 0) + 1);
				visit(item);
			}
		}
	};
	visit(data);
	return { keys: summarize(keys), values: summarize(values) };
}

function summarize(counts: ReadonlyMap<string, number>): StringStats {
	let occurrences = 0;
	let bytes = 0;
	let uniqueBytes = 0;
	for (const [text, count] of counts) {
		const size = Buffer.byteLength(text);
		occurrences += count;
		bytes += size * count;
		uniqueBytes += size;
	}
	return { occurrences, unique: counts.size, bytes, uniqueBytes };
}

/** The values of one field, a field being a path through the document. */
export interface FieldStats {
	/** Keys joined by `.`, `[]` for an array, `{}` for the keys of a dictionary-like object. */
	readonly path: string;
	readonly occurrences: number;
	readonly unique: number;
	/** Bytes of the values as JSON text. */
	readonly bytes: number;
	/** Zero-order entropy of the values times their number: the bits that the field needs at best. */
	readonly entropyBits: number;
}

/**
 * An object with this many keys or more is read as a dictionary: its keys are data (an attribute name, a
 * category) and not field names, and each would otherwise be a field of its own.
 */
const DICTIONARY_KEYS = 16;

/**
 * Measures each field of a document.
 *
 * @param data - A parsed JSON value
 * @returns The fields, the one that takes the most bytes first
 */
export function fieldStats(data: unknown): FieldStats[] {
	const fields = new Map<string, Map<string, number>>();
	const visit = (value: unknown, path: string) => {
		if (Array.isArray(value)) {
			for (const item of value) {
				visit(item, `${path}[]`);
			}
		} else if (typeof value === 'object' && value !== null) {
			const entries = Object.entries(value);
			const dictionary = entries.length >= DICTIONARY_KEYS;
			for (const [key, item] of entries) {
				const segment = dictionary ? '{}' : key;
				visit(item, path === '' ? segment : `${path}.${segment}`);
			}
		} else {
			const values = fields.get(path) ?? new Map<string, number>();
			const text = JSON.stringify(value);
			values.set(text, (values.get(text) ?? 0) + 1);
			fields.set(path, values);
		}
	};
	visit(data, '');
	return [...fields]
		.map(([path, values]) => {
			let occurrences = 0;
			let bytes = 0;
			for (const [text, count] of values) {
				occurrences += count;
				bytes += Buffer.byteLength(text) * count;
			}
			let entropy = 0;
			for (const count of values.values()) {
				entropy -= (count / occurrences) * Math.log2(count / occurrences);
			}
			return { path, occurrences, unique: values.size, bytes, entropyBits: entropy * occurrences };
		})
		.toSorted((a, b) => b.bytes - a.bytes || compareText(a.path, b.path));
}

/** A subtree that occurs more than once. */
export interface RepeatedSubtree {
	readonly occurrences: number;
	/** Bytes of the subtree as minified JSON. */
	readonly size: number;
	/** What keeping one copy saves: `(occurrences - 1) * size`. A subtree inside another repeated one is counted in both. */
	readonly saving: number;
	/** Where the first occurrence is. */
	readonly path: string;
	/** The start of its JSON text. */
	readonly preview: string;
}

/** The tree against the DAG that shares identical subtrees. */
export interface DagStats {
	readonly treeNodes: number;
	readonly dagNodes: number;
	readonly repeated: RepeatedSubtree[];
}

/**
 * Shares identical subtrees (hash-consing). Two objects are identical when they have the same keys with
 * identical values, whatever the order of the keys: the order of the keys of the data means nothing.
 *
 * @param data - A parsed JSON value
 * @param top - How many repeated subtrees to list
 * @returns The node counts, and the repeated objects and arrays that would save the most bytes
 */
export function dagStats(data: unknown, top: number): DagStats {
	const ids = new Map<string, number>();
	const info: { occurrences: number; size: number; path: string; text: string; leaf: boolean }[] = [];
	let treeNodes = 0;

	const visit = (value: unknown, path: string): number => {
		treeNodes++;
		const leaf = typeof value !== 'object' || value === null;
		let key: string;
		let size: number;
		if (Array.isArray(value)) {
			const children = value.map((item, index) => visit(item, `${path}[${index}]`));
			key = `[${children.join(',')}]`;
			size = Buffer.byteLength(JSON.stringify(value));
		} else if (leaf) {
			key = JSON.stringify(value);
			size = Buffer.byteLength(key);
		} else {
			const entries = Object.entries(value as Record<string, unknown>).toSorted(([a], [b]) => compareText(a, b));
			const children = entries.map(([name, item]) => `${JSON.stringify(name)}:${visit(item, `${path}.${name}`)}`);
			key = `{${children.join(',')}}`;
			size = Buffer.byteLength(JSON.stringify(value));
		}
		const known = ids.get(key);
		if (known !== undefined) {
			const entry = info[known];
			if (entry) {
				entry.occurrences++;
			}
			return known;
		}
		const id = info.length;
		ids.set(key, id);
		info.push({ occurrences: 1, size, path, text: leaf ? key : JSON.stringify(value), leaf });
		return id;
	};
	visit(data, '');

	const repeated = info
		.filter(entry => !entry.leaf && entry.occurrences > 1)
		.map(entry => ({
			occurrences: entry.occurrences,
			size: entry.size,
			saving: (entry.occurrences - 1) * entry.size,
			path: entry.path,
			preview: entry.text.slice(0, 80),
		}))
		.toSorted((a, b) => b.saving - a.saving || compareText(a.path, b.path))
		.slice(0, top);

	return { treeNodes, dagNodes: info.length, repeated };
}
