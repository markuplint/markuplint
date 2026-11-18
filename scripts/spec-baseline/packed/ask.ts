/**
 * Answers the questions of `questions.ts` from a packed spec, and from the plain objects of the JSON as the code of the
 * packages reads them today (the baseline). The Rust program does the same loops in
 * `crates/markuplint-types/examples/packed_candidates/questions.rs`.
 *
 * The loops are what is timed, so they do nothing but ask: a question is read from the numbers of the file, a lookup is
 * made with the name as a string (the cost of hashing or comparing it is the cost of the candidate), and the answer is
 * stored. The objects have the best that an object can have: a table that an index of names covers is looked up in a
 * `Map` that is made the first time it is needed and kept, as `getSpecByTagName` keeps one.
 *
 * @module
 */
import type { QuestionsFile } from './questions.ts';

import { FLAGS, INDEX_MINIMUM, NONE, RegionAt } from './format.ts';
import { digestJson, type PackedSpec } from './read.ts';
import { Op, Step } from './questions.ts';

/**
 * A string of the table of the questions: a number that points at none is an error and not a name that is `''`.
 *
 * @param strings - The table
 * @param index - The number of the string
 * @returns The string
 */
function text(strings: readonly string[], index: number | undefined): string {
	const found = index === undefined ? undefined : strings[index];
	if (found === undefined) {
		throw new Error(`There is no string ${index} in the table of the questions`);
	}
	return found;
}

/**
 * Answers the questions of the bits.
 *
 * @param packed - The spec
 * @param questions - The questions
 * @returns 1 or 0 for each
 */
export function askBits(packed: PackedSpec, questions: QuestionsFile): Uint8Array {
	const { bits } = questions;
	const answers = new Uint8Array(questions.bitAnswers.length);
	for (let position = 0; position < answers.length; position++) {
		const kind = bits[3 * position];
		const element = bits[3 * position + 1] ?? 0;
		const index = bits[3 * position + 2] ?? 0;
		answers[position] = kind === 0 ? packed.flag(element, index) : packed.member(element, index);
	}
	return answers;
}

/**
 * Answers the questions of the paths.
 *
 * @param packed - The spec
 * @param questions - The questions
 * @returns A digest for each, or 0
 */
export function askPaths(packed: PackedSpec, questions: QuestionsFile): Uint32Array {
	const { paths, strings } = questions;
	const answers = new Uint32Array(questions.pathAnswers.length);
	let at = 0;
	for (let position = 0; position < answers.length; position++) {
		at = walkPacked(packed, paths, at, strings, answers, position);
	}
	return answers;
}

/** Walks one path that starts at `at` of `words`, stores its digest in `answers[position]` and gives the position after it. */
function walkPacked(
	packed: PackedSpec,
	words: readonly number[],
	start: number,
	strings: readonly string[],
	answers: Uint32Array,
	position: number,
): number {
	const region = packed.regions[words[start] ?? 0];
	if (!region) {
		throw new Error(`There is no region ${words[start]}`);
	}
	const steps = words[start + 1] ?? 0;
	let at = start + 2;
	let node = region.root;
	for (let step = 0; step < steps; step++) {
		const kind = words[at];
		const argument = words[at + 1] ?? 0;
		at += 2;
		if (node === NONE) {
			continue;
		}
		node =
			kind === Step.Key
				? packed.get(region, node, text(strings, argument))
				: kind === Step.Index
					? packed.at(region, node, argument)
					: packed.find(region, node, text(strings, argument));
	}
	answers[position] = packed.digest(region, node);
	return at;
}

/**
 * Answers the operations of the stream.
 *
 * @param packed - The spec
 * @param questions - The questions
 * @returns For each: a digest, a bit, or 2 for what is not there
 */
export function askStream(packed: PackedSpec, questions: QuestionsFile): Uint32Array {
	const { stream, strings } = questions;
	const answers = new Uint32Array(questions.streamAnswers.length);
	const specs = packed.regions[RegionAt.Specs];
	const content = packed.regions[RegionAt.ContentModels];
	if (!specs || !content) {
		throw new Error('A packed spec has five regions');
	}
	let at = 0;
	for (let position = 0; position < answers.length; position++) {
		const op = stream[at];
		if (op === Op.Path) {
			at = walkPacked(packed, stream, at + 1, strings, answers, position);
		} else if (op === Op.Flag) {
			const element = packed.position(specs, specs.root, text(strings, stream[at + 1]));
			answers[position] = element === NONE ? 2 : packed.flag(element, stream[at + 2] ?? 0);
			at += 3;
		} else {
			const element = packed.position(specs, specs.root, text(strings, stream[at + 1]));
			const row = packed.entry(content, content.root, text(strings, stream[at + 2]));
			answers[position] = element === NONE || row === NONE ? 2 : packed.member(element, row);
			at += 3;
		}
	}
	return answers;
}

/** The regions of the JSON, and the tables that are made for them the first time. */
export class ObjectSpec {
	readonly regions: readonly unknown[];
	private readonly tables = new WeakMap<object, Map<string, unknown>>();
	private readonly sets = new WeakMap<object, Set<string>>();

	constructor(regions: readonly unknown[]) {
		this.regions = regions;
	}

	private table(array: readonly unknown[]): Map<string, unknown> {
		let table = this.tables.get(array);
		if (!table) {
			table = new Map();
			for (const item of array) {
				const { name } = item as { name: string };
				if (!table.has(name)) {
					table.set(name, item);
				}
			}
			this.tables.set(array, table);
		}
		return table;
	}

	/**
	 * The object of an array that has the name, through a table when the array is long, as the code of today does.
	 *
	 * @param array - The array
	 * @param name - The name
	 * @returns The first object that has it, or `undefined`
	 */
	named(array: unknown, name: string): unknown {
		if (!Array.isArray(array)) {
			return undefined;
		}
		if (array.length >= INDEX_MINIMUM) {
			return this.table(array).get(name);
		}
		return array.find(
			item => typeof item === 'object' && item !== null && (item as { name?: unknown }).name === name,
		);
	}

	/**
	 * The members of a category as a set, which is made the first time and kept.
	 *
	 * @param list - The array of the members
	 * @returns The set
	 */
	members(list: unknown): Set<string> {
		let set = this.sets.get(list as object);
		if (!set) {
			set = new Set(list as string[]);
			this.sets.set(list as object, set);
		}
		return set;
	}
}

function walkObjects(
	spec: ObjectSpec,
	words: readonly number[],
	start: number,
	strings: readonly string[],
	answers: Uint32Array,
	position: number,
): number {
	let value: unknown = spec.regions[words[start] ?? 0];
	const steps = words[start + 1] ?? 0;
	let at = start + 2;
	for (let step = 0; step < steps; step++) {
		const kind = words[at];
		const argument = words[at + 1] ?? 0;
		at += 2;
		if (value === undefined) {
			continue;
		}
		if (kind === Step.Key) {
			// an own key only: a name such as `constructor` is not a key that the data has
			value =
				typeof value === 'object' &&
				value !== null &&
				!Array.isArray(value) &&
				Object.hasOwn(value, text(strings, argument))
					? (value as Record<string, unknown>)[text(strings, argument)]
					: undefined;
		} else if (kind === Step.Index) {
			value = Array.isArray(value) ? value[argument] : undefined;
		} else {
			value = spec.named(value, text(strings, argument));
		}
	}
	answers[position] = value === undefined ? 0 : digestJson(value);
	return at;
}

/**
 * Answers the questions of the paths from the objects.
 *
 * @param spec - The regions
 * @param questions - The questions
 * @returns A digest for each, or 0
 */
export function askPathsObjects(spec: ObjectSpec, questions: QuestionsFile): Uint32Array {
	const answers = new Uint32Array(questions.pathAnswers.length);
	let at = 0;
	for (let position = 0; position < answers.length; position++) {
		at = walkObjects(spec, questions.paths, at, questions.strings, answers, position);
	}
	return answers;
}

/**
 * Answers the operations of the stream from the objects.
 *
 * @param spec - The regions
 * @param questions - The questions
 * @returns For each: a digest, a bit, or 2 for what is not there
 */
export function askStreamObjects(spec: ObjectSpec, questions: QuestionsFile): Uint32Array {
	const { stream, strings } = questions;
	const answers = new Uint32Array(questions.streamAnswers.length);
	const specs = spec.regions[RegionAt.Specs];
	const content = spec.regions[RegionAt.ContentModels] as Record<string, unknown>;
	let at = 0;
	for (let position = 0; position < answers.length; position++) {
		const op = stream[at];
		if (op === Op.Path) {
			at = walkObjects(spec, stream, at + 1, strings, answers, position);
		} else if (op === Op.Flag) {
			const element = spec.named(specs, text(strings, stream[at + 1])) as Record<string, unknown> | undefined;
			answers[position] = element === undefined ? 2 : element[FLAGS[stream[at + 2] ?? 0] ?? ''] === true ? 1 : 0;
			at += 3;
		} else {
			const name = text(strings, stream[at + 1]);
			const element = spec.named(specs, name);
			const list = content[text(strings, stream[at + 2])];
			answers[position] = element === undefined || list === undefined ? 2 : spec.members(list).has(name) ? 1 : 0;
			at += 3;
		}
	}
	return answers;
}

/**
 * Answers the questions of the bits from the objects.
 *
 * @param spec - The regions
 * @param questions - The questions
 * @returns 1 or 0 for each
 */
export function askBitsObjects(spec: ObjectSpec, questions: QuestionsFile): Uint8Array {
	const specs = spec.regions[RegionAt.Specs] as Record<string, unknown>[];
	const content = Object.values(spec.regions[RegionAt.ContentModels] as Record<string, string[]>);
	const { bits } = questions;
	const answers = new Uint8Array(questions.bitAnswers.length);
	for (let position = 0; position < answers.length; position++) {
		const element = specs[bits[3 * position + 1] ?? 0] as Record<string, unknown>;
		const index = bits[3 * position + 2] ?? 0;
		answers[position] =
			bits[3 * position] === 0
				? element[FLAGS[index] ?? ''] === true
					? 1
					: 0
				: spec.members(content[index]).has(element.name as string)
					? 1
					: 0;
	}
	return answers;
}
