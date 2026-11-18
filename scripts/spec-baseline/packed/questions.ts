/**
 * The questions that the candidates are measured with, and the answers that the data gives to each, made from the JSON
 * and not from a candidate: a reader that answers differently is wrong, however fast.
 *
 * - **bits**: "does this element have this flag", "is this element in this category" for every element
 *   and every flag and category, as `layout.ts` asks them.
 * - **paths**: a walk from the root of a region by keys of objects, positions of arrays and names of the objects of an
 *   array that a table indexes (the names of the elements, of the roles, of the properties), which ends with the digest
 *   of what it finds or with 0 when it finds nothing. Every few-th value of the data is the end of one, and one in
 *   eight of them is made again with the last step changed to what is not there, so that the miss that a lookup of
 *   a name that is not in the spec ends with (the common case of a lint) is a question too.
 * - **stream**: the lookups that the rules make for the elements and the attributes of real documents, in the order of
 *   the documents. It is not a trace of the engine (the functions of `@markuplint/ml-spec` can be wrapped, but a rule
 *   that searches an array that it was given, such as the properties of ARIA, cannot be seen): it is a model of what the
 *   rules read, one that does not change when a rule is added, and the same for every candidate. For each element:
 *   its flags and its spec by name (`getSpecByTagName`, the rules of `no-deprecated-element` and the like); for each of its
 *   attributes, the attribute among those of the element and, when it is not, the groups of global attributes that the
 *   element selects (a group that is `false` is skipped, and one that is a list has only the attributes that it lists), in
 *   order, until one has it (`getAttrSpecs`); for a `role`, each role that it names, and for an `aria-*`, the property of that
 *   name, in the ARIA version that the rules read by default (`ARIA_RECOMMENDED_VERSION`); and for an element that has a
 *   parent, whether it is in `#flow` and in `#phrasing` (`permitted-contents`). The names are as the data has them: lower
 *   case for HTML, and as the parser gives them for SVG and MathML (`clipPath`, `viewBox`).
 *
 * The questions are written as numbers and a table of strings, in the file that the Rust program reads.
 *
 * @module
 */
import type { SpecLike } from './encode.ts';

import { regionValues } from './encode.ts';
import { FLAGS, INDEX_MINIMUM, RegionAt } from './format.ts';
import { digestJson } from './read.ts';

/** The kinds of a step of a path. */
export const Step = { Key: 0, Index: 1, Named: 2 } as const;

/** A step: a key of an object, a position of an array, or the name of an object of an array. */
export type StepLike = readonly [kind: (typeof Step)[keyof typeof Step], argument: string | number];

/** A walk from the root of a region. */
export interface PathLike {
	/** The position of the region in `REGIONS`. */
	readonly region: number;
	readonly steps: readonly StepLike[];
}

/** The kinds of an operation of a stream. */
export const Op = { Path: 0, Flag: 1, Member: 2 } as const;

/** The questions as the file of the Rust program has them: numbers, and the strings they refer to. */
export interface QuestionsFile {
	readonly strings: readonly string[];
	/** Three numbers for each question: 0 for a flag or 1 for a category, the position of the element, and the flag or the row of the category. */
	readonly bits: readonly number[];
	readonly bitAnswers: readonly number[];
	/** For each path: the region, the number of steps, and a kind and an argument for each step (a number, or a string of `strings`). */
	readonly paths: readonly number[];
	readonly pathAnswers: readonly number[];
	/** For each operation: `[0, region, steps, ...]` as a path, `[1, element name, flag]`, or `[2, element name, category name]`. */
	readonly stream: readonly number[];
	/** One for each operation: a digest, or the bit (0 or 1) and 2 for an element or a category that is not there. */
	readonly streamAnswers: readonly number[];
}

/** What a walk finds. */
function walk(root: unknown, steps: readonly StepLike[]): { found: boolean; value: unknown } {
	let value = root;
	for (const [kind, argument] of steps) {
		if (kind === Step.Key) {
			if (typeof value !== 'object' || value === null || Array.isArray(value)) {
				return { found: false, value: undefined };
			}
			const next = (value as Record<string, unknown>)[argument as string];
			if (!Object.hasOwn(value, argument as string) || next === undefined) {
				return { found: false, value: undefined };
			}
			value = next;
		} else if (kind === Step.Index) {
			if (!Array.isArray(value) || (argument as number) < 0 || (argument as number) >= value.length) {
				return { found: false, value: undefined };
			}
			value = value[argument as number];
		} else {
			if (!Array.isArray(value)) {
				return { found: false, value: undefined };
			}
			const next = value.find(item => isNamed(item) && item.name === argument);
			if (next === undefined) {
				return { found: false, value: undefined };
			}
			value = next;
		}
	}
	return { found: true, value };
}

function isNamed(value: unknown): value is { name: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		typeof (value as { name?: unknown }).name === 'string'
	);
}

/**
 * The digest that the data gives to a path.
 *
 * @param regions - The values of the regions, in the order of `REGIONS`
 * @param path - The walk
 * @returns The digest of what the walk finds, or 0 when it finds nothing
 */
export function answerPath(regions: readonly unknown[], path: PathLike): number {
	const { found, value } = walk(regions[path.region], path.steps);
	return found ? digestJson(value) : 0;
}

/** An array that a table indexes: names are the way to reach its objects. */
function isTable(value: readonly unknown[]): boolean {
	return value.length >= INDEX_MINIMUM && value.every(item => isNamed(item));
}

/** Every value that is below the root of a region, with the walk that reaches it. */
function allPaths(region: number, root: unknown): PathLike[] {
	const found: PathLike[] = [];
	const visit = (value: unknown, steps: readonly StepLike[]) => {
		if (Array.isArray(value)) {
			const table = isTable(value);
			for (const [position, item] of value.entries()) {
				const step: StepLike = table ? [Step.Named, (item as { name: string }).name] : [Step.Index, position];
				found.push({ region, steps: [...steps, step] });
				visit(item, [...steps, step]);
			}
		} else if (typeof value === 'object' && value !== null) {
			for (const [key, item] of Object.entries(value)) {
				if (item === undefined) {
					continue;
				}
				found.push({ region, steps: [...steps, [Step.Key, key]] });
				visit(item, [...steps, [Step.Key, key]]);
			}
		}
	};
	visit(root, []);
	return found;
}

/** The ARIA version that the questions of the stream ask, which is the one that the rules read when a configuration names none. */
export const ARIA_VERSION = '1.3';

/** How many questions of paths to make, about. */
export const PATH_TARGET = 6000;

/**
 * The paths that are asked: every few-th path below the root of each region, and one in eight of these again with its last step changed to one that finds
 * nothing.
 *
 * @param spec - The spec
 * @param target - About how many hits
 * @returns The paths
 */
export function pathsOf(spec: SpecLike, target: number = PATH_TARGET): PathLike[] {
	const everything = regionValues(spec).flatMap((root, region) => allPaths(region, root));
	const every = Math.max(1, Math.ceil(everything.length / target));
	const chosen = everything.filter((_, index) => index % every === 0);
	const misses: PathLike[] = [];
	for (const [index, path] of chosen.entries()) {
		if (index % 8 !== 0) {
			continue;
		}
		const last = path.steps.at(-1);
		if (!last) {
			continue;
		}
		const changed: StepLike = last[0] === Step.Index ? [Step.Index, 1_000_000] : [last[0], `${last[1]}~`];
		misses.push({ region: path.region, steps: [...path.steps.slice(0, -1), changed] });
	}
	return [...chosen, ...misses];
}

/** What the bits are asked: the elements, the flags and the categories, as the data names them. */
export interface BitsOf {
	readonly elements: readonly { readonly name: string; readonly flags: readonly boolean[] }[];
	/** The categories in the order of the data. */
	readonly categories: readonly { readonly name: string; readonly members: ReadonlySet<string> }[];
}

/**
 * The elements, with their flags, and the categories, with their members, of a spec.
 *
 * @param spec - The spec
 * @returns The two lists
 */
export function bitsOf(spec: SpecLike): BitsOf {
	const specs = (Array.isArray(spec.specs) ? spec.specs : []) as Record<string, unknown>[];
	const models = (spec.def?.['#contentModels'] ?? {}) as Record<string, string[]>;
	return {
		elements: specs.map(element => ({
			name: element.name as string,
			flags: FLAGS.map(flag => element[flag] === true),
		})),
		categories: Object.entries(models).map(([name, members]) => ({ name, members: new Set(members) })),
	};
}

/** The parts of a document that the stream is made from. */
export interface DocumentElement {
	/** The name as the data names the element: lower case for HTML, and with `svg:` or `mml:` before the name of an element of those languages, in the case that the parser gives it. */
	readonly name: string;
	/** The names of the attributes, lower case for an element of HTML and as written for one of SVG or MathML, with their values. */
	readonly attributes: readonly (readonly [string, string])[];
	/** The name of the parent, when it has one that is an element. */
	readonly parent: string | null;
}

/** Makes the file of questions. */
class Builder {
	readonly strings: string[] = [];
	private readonly ids = new Map<string, number>();
	readonly bits: number[] = [];
	readonly bitAnswers: number[] = [];
	readonly paths: number[] = [];
	readonly pathAnswers: number[] = [];
	readonly stream: number[] = [];
	readonly streamAnswers: number[] = [];

	intern(text: string): number {
		let id = this.ids.get(text);
		if (id === undefined) {
			id = this.strings.length;
			this.strings.push(text);
			this.ids.set(text, id);
		}
		return id;
	}

	pathWords(path: PathLike): number[] {
		return [
			path.region,
			path.steps.length,
			...path.steps.flatMap(([kind, argument]) => [
				kind,
				typeof argument === 'string' ? this.intern(argument) : argument,
			]),
		];
	}

	file(): QuestionsFile {
		return {
			strings: this.strings,
			bits: this.bits,
			bitAnswers: this.bitAnswers,
			paths: this.paths,
			pathAnswers: this.pathAnswers,
			stream: this.stream,
			streamAnswers: this.streamAnswers,
		};
	}
}

/**
 * The groups of global attributes that an element can have an attribute from, in the order of the data, as `getAttrSpecs`
 * takes them: a group that is `false` has none, a group that is a list has the attributes that it lists, and any other has all of its.
 */
function groupsOf(element: Record<string, unknown> | undefined, attribute: string): string[] {
	const groups = element?.globalAttrs;
	if (typeof groups !== 'object' || groups === null) {
		return [];
	}
	return Object.entries(groups)
		.filter(([, selected]) => selected !== false && (!Array.isArray(selected) || selected.includes(attribute)))
		.map(([group]) => group);
}

/**
 * Makes the questions.
 *
 * @param spec - The spec
 * @param documents - The elements of the documents of the stream, in order
 * @param options - How many of each
 * @param options.pathTarget - About how many hits among the paths
 * @param options.streamLimit - How many operations the stream has at least before it stops: it stops after the element that reaches this
 * @returns The file of the questions
 */
export function makeQuestions(
	spec: SpecLike,
	documents: readonly (readonly DocumentElement[])[],
	options: { readonly pathTarget?: number; readonly streamLimit?: number } = {},
): QuestionsFile {
	const builder = new Builder();
	const regions = regionValues(spec);
	const { elements, categories } = bitsOf(spec);

	for (const [element, { flags }] of elements.entries()) {
		for (const [flag, has] of flags.entries()) {
			builder.bits.push(0, element, flag);
			builder.bitAnswers.push(has ? 1 : 0);
		}
	}
	for (const [element, { name }] of elements.entries()) {
		for (const [row, { members }] of categories.entries()) {
			builder.bits.push(1, element, row);
			builder.bitAnswers.push(members.has(name) ? 1 : 0);
		}
	}

	for (const path of pathsOf(spec, options.pathTarget)) {
		builder.paths.push(...builder.pathWords(path));
		builder.pathAnswers.push(answerPath(regions, path));
	}

	const limit = options.streamLimit ?? 20_000;
	const specs = (Array.isArray(spec.specs) ? spec.specs : []) as Record<string, unknown>[];
	const byName = new Map<string, Record<string, unknown>>();
	for (const element of specs) {
		if (!byName.has(element.name as string)) {
			byName.set(element.name as string, element);
		}
	}
	const categoryByName = new Map(categories.map(category => [category.name, category]));

	const path = (value: PathLike) => {
		builder.stream.push(Op.Path, ...builder.pathWords(value));
		builder.streamAnswers.push(answerPath(regions, value));
		return builder.streamAnswers.at(-1) ?? 0;
	};
	const flag = (name: string, index: number) => {
		builder.stream.push(Op.Flag, builder.intern(name), index);
		const element = byName.get(name);
		builder.streamAnswers.push(element === undefined ? 2 : element[FLAGS[index] ?? ''] === true ? 1 : 0);
	};
	const member = (name: string, category: string) => {
		builder.stream.push(Op.Member, builder.intern(name), builder.intern(category));
		const found = categoryByName.get(category);
		builder.streamAnswers.push(byName.has(name) && found ? (found.members.has(name) ? 1 : 0) : 2);
	};

	outer: for (const document of documents) {
		for (const element of document) {
			if (builder.streamAnswers.length >= limit) {
				break outer;
			}
			const own = byName.get(element.name);
			for (let index = 0; index < FLAGS.length; index++) {
				flag(element.name, index);
			}
			path({ region: RegionAt.Specs, steps: [[Step.Named, element.name]] });
			for (const [attribute, value] of element.attributes) {
				const isOwn = path({
					region: RegionAt.Specs,
					steps: [
						[Step.Named, element.name],
						[Step.Key, 'attributes'],
						[Step.Key, attribute],
					],
				});
				if (isOwn === 0) {
					for (const group of groupsOf(own, attribute)) {
						const hit = path({
							region: RegionAt.GlobalAttrs,
							steps: [
								[Step.Key, group],
								[Step.Key, attribute],
							],
						});
						if (hit !== 0) {
							break;
						}
					}
				}
				if (attribute === 'role') {
					for (const role of value.toLowerCase().split(/\s+/u).filter(Boolean)) {
						path({
							region: RegionAt.Aria,
							steps: [
								[Step.Key, ARIA_VERSION],
								[Step.Key, 'roles'],
								[Step.Named, role],
							],
						});
					}
				} else if (attribute.startsWith('aria-')) {
					path({
						region: RegionAt.Aria,
						steps: [
							[Step.Key, ARIA_VERSION],
							[Step.Key, 'props'],
							[Step.Named, attribute],
						],
					});
				}
			}
			if (element.parent !== null) {
				member(element.name, '#flow');
				member(element.name, '#phrasing');
			}
		}
	}
	return builder.file();
}
