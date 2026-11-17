/**
 * Documents for timing the lint of a large file, generated from the content models of the spec.
 *
 * The documents of the validator's corpus are small, and what a packed format changes for them is
 * the cost of starting. The cost of looking a category or a content model up shows only in a
 * large and deep document, and no real page can be committed for it (copyright, and the repository
 * keeps no real domain). So the document is derived from the data under test: each element is
 * given the children that its content model asks for, taking a member of a category for a
 * category, so that the document has the shape the rules are written for and is accepted by
 * `permitted-contents`.
 *
 * The coverage of a content model is what the generator walks to, not an exhaustive enumeration
 * of the language (Purdom, "A sentence generator for testing parsers", BIT 1972, takes the shortest
 * way to use every production; this one uses a seeded random choice at each production, which a
 * budget of elements then drives toward the same end). Only plain tag names are chosen from a
 * category: a member that is a selector (`a[href]`) is a condition on the element, and choosing it
 * would need an element that satisfies it. The parts of a table (`tr`, `td`) are chosen only where a content model
 * names them, because no category of the data lists them. Some elements are left out of the choice (`NOT_GENERATED`),
 * and attributes are not generated.
 *
 * @module
 */
import { mulberry32 } from './stats.ts';

/** What the generator reads of the data. */
export interface GeneratorSpec {
	readonly def: { readonly '#contentModels': Readonly<Record<string, readonly string[]>> };
	readonly specs: readonly {
		readonly name: string;
		readonly contentModel?: {
			readonly contents: unknown;
			readonly conditional?: readonly { readonly condition: string; readonly contents: unknown }[];
		};
	}[];
}

/** Options of {@link generateDocument}. */
export interface GenerateOptions {
	readonly seed: number;
	/** How many elements the body should have, at least; what a content model requires comes on top. */
	readonly elements: number;
	/** How deep the nesting may go. */
	readonly depth?: number;
}

/**
 * Elements that are never chosen, for two reasons. Some are read by the parser under rules of their own, or carry
 * content that is not markup (`script`, `style`, `textarea`, `plaintext`, `svg`, `math`, the elements of a frameset).
 * The others have a restriction on what is inside them that the generator does not follow, which would make a
 * document that `permitted-contents` rejects: interactive content in `a`, `button` and `label`, a `form` in a
 * `form`, the `summary` and the `rt` that an element needs as a child, the `source` or `track` that comes before the
 * fallback of `audio` and `video`.
 */
const NOT_GENERATED = new Set([
	'html',
	'head',
	'body',
	'frameset',
	'frame',
	'script',
	'style',
	'template',
	'noscript',
	'iframe',
	'textarea',
	'plaintext',
	'xmp',
	'noembed',
	'noframes',
	'slot',
	'title',
	'object',
	'embed',
	'select',
	'optgroup',
	'option',
	'datalist',
	'dialog',
	'details',
	'summary',
	'form',
	'a',
	'button',
	'label',
	'ruby',
	'rb',
	'rt',
	'rtc',
	'rp',
	'audio',
	'video',
	'picture',
	'map',
	'area',
	'canvas',
	'math',
	'svg',
]);

const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa'];

type Pattern = Readonly<Record<string, unknown>>;

class Generator {
	readonly #random: () => number;
	readonly #categories: Map<string, readonly string[]>;
	readonly #models = new Map<string, unknown>();
	/** The contents that an element has under a parent, from the conditions of the form `parent > element`. */
	readonly #underParent = new Map<string, unknown>();
	readonly #ancestors: string[] = [];
	readonly #void = new Set<string>();
	/** Elements whose content takes flow content, which is where a document gets its structure. */
	readonly #containers = new Set<string>();
	readonly #maxDepth: number;
	readonly #budget: number;
	/** The count at which the current top-level child stops growing: one branch must not take the whole budget. */
	#limit = 0;
	#count = 0;

	constructor(spec: GeneratorSpec, random: () => number, budget: number, maxDepth: number) {
		this.#random = random;
		this.#budget = budget;
		this.#maxDepth = maxDepth;
		for (const element of spec.specs) {
			if (element.name.includes(':')) {
				continue;
			}
			if (JSON.stringify(element.contentModel?.contents ?? null).includes('"transparent"')) {
				// What such an element may hold is what its parent may, which the choice here does not track.
				continue;
			}
			this.#models.set(element.name, element.contentModel?.contents);
			for (const { condition, contents } of element.contentModel?.conditional ?? []) {
				const child = /^([a-z\d-]+) > ([a-z\d-]+)$/.exec(condition);
				if (child?.[2] === element.name) {
					this.#underParent.set(`${child[1]} > ${element.name}`, contents);
				}
			}
			if (element.contentModel?.contents === false) {
				this.#void.add(element.name);
			}
			if (/"(?:#flow|:model\(flow\))"/.test(JSON.stringify(element.contentModel?.contents ?? null))) {
				this.#containers.add(element.name);
			}
		}
		this.#categories = new Map(
			Object.entries(spec.def['#contentModels']).map(([category, members]) => [
				category,
				members.filter(member => this.#models.has(member) && !NOT_GENERATED.has(member)),
			]),
		);
	}

	get count(): number {
		return this.#count;
	}

	/** Whether the budget is spent, after which the choices that grow the document are not taken. */
	get #spent(): boolean {
		return this.#count >= Math.min(this.#budget, this.#limit);
	}

	#int(max: number): number {
		return Math.floor(this.#random() * max);
	}

	text(): string {
		this.#count++;
		return WORDS[this.#int(WORDS.length)] ?? '';
	}

	element(name: string, depth: number): string {
		this.#count++;
		if (this.#void.has(name)) {
			return `<${name}>`;
		}
		const parent = this.#ancestors.at(-1);
		const contents = this.#underParent.get(`${parent} > ${name}`) ?? this.#models.get(name);
		this.#ancestors.push(name);
		const inner = this.#contents(contents, depth + 1);
		this.#ancestors.pop();
		return `<${name}>${inner}</${name}>`;
	}

	/** The children of the body, until the budget is spent. */
	body(depth: number): string {
		let out = '';
		const flow = this.#categories.get('#flow') ?? [];
		while (this.#count < this.#budget && flow.length > 0) {
			// Most children are small, and one in five is large enough to nest deeply.
			this.#limit = this.#count + (this.#int(5) === 0 ? 200 : 8 + this.#int(40));
			out += this.#place(this.#choose(flow), depth);
		}
		return out;
	}

	#contents(contents: unknown, depth: number): string {
		if (contents === true) {
			return this.#spent ? '' : this.text();
		}
		if (!Array.isArray(contents)) {
			return '';
		}
		return this.#sequence(contents as Pattern[], depth);
	}

	#sequence(patterns: readonly Pattern[], depth: number): string {
		let out = '';
		for (const pattern of patterns) {
			out += this.#pattern(pattern, depth);
		}
		return out;
	}

	#times(pattern: Pattern): number {
		const room = this.#spent || this.#random() < 0.3;
		const max = typeof pattern.max === 'number' ? pattern.max : 3;
		if ('require' in pattern) {
			const min = typeof pattern.min === 'number' ? pattern.min : 1;
			// Without a `max` the pattern takes `min` elements and no more.
			const most = typeof pattern.max === 'number' ? pattern.max : min;
			return room ? min : min + this.#int(most - min + 1);
		}
		if ('optional' in pattern) {
			return room ? 0 : 1;
		}
		if ('oneOrMore' in pattern) {
			return room ? 1 : Math.min(max, 1 + this.#int(3));
		}
		if ('zeroOrMore' in pattern) {
			return room ? 0 : Math.min(max, this.#int(4));
		}
		return 1;
	}

	#pattern(pattern: Pattern, depth: number): string {
		if ('transparent' in pattern) {
			return '';
		}
		if ('choice' in pattern && Array.isArray(pattern.choice)) {
			const branches = pattern.choice as Pattern[][];
			const branch = branches[this.#spent ? 0 : this.#int(branches.length)] ?? [];
			return this.#sequence(branch, depth);
		}
		const key = ['require', 'optional', 'oneOrMore', 'zeroOrMore'].find(name => name in pattern);
		if (!key) {
			return '';
		}
		const times = this.#times(pattern);
		let out = '';
		for (let i = 0; i < times; i++) {
			out += this.#model(pattern[key], depth);
		}
		return out;
	}

	/** A model is a name, a category, or a list of alternatives, and a pattern list for a nested sequence. */
	#model(model: unknown, depth: number): string {
		if (Array.isArray(model)) {
			if (model.length > 0 && model.every(item => typeof item === 'object' && item !== null)) {
				return this.#sequence(model as Pattern[], depth);
			}
			const alternatives = model.filter((item): item is string => typeof item === 'string');
			return this.#model(alternatives[this.#int(alternatives.length)], depth);
		}
		if (typeof model !== 'string') {
			return '';
		}
		const named = /^:model\(([^)]+)\)$/.exec(model);
		if (named) {
			return this.#model(`#${named[1]}`, depth);
		}
		if (model === '#text' || model === '#nonEmptyText') {
			return this.text();
		}
		if (model.startsWith('#')) {
			const members = this.#categories.get(model) ?? [];
			// Near the limit of the depth, a member that has no children keeps the nesting from going on.
			const pool = depth >= this.#maxDepth ? members.filter(member => this.#void.has(member)) : members;
			const candidates = pool.length > 0 ? pool : members;
			return candidates.length > 0 ? this.#place(this.#choose(candidates), depth) : '';
		}
		return this.#models.has(model) && !NOT_GENERATED.has(model) ? this.#place(model, depth) : '';
	}

	/** Takes a container half of the time when there is one, as the elements of a category are mostly leaves. */
	#choose(members: readonly string[]): string {
		const containers = members.filter(member => this.#containers.has(member));
		const pool = containers.length > 0 && this.#random() < 0.5 ? containers : members;
		return pool[this.#int(pool.length)] ?? '';
	}

	#place(name: string, depth: number): string {
		return depth > this.#maxDepth + 40 ? '' : this.element(name, depth);
	}
}

/**
 * Generates a document.
 *
 * @param spec - The data of `@markuplint/html-spec`
 * @param options - The seed, the number of elements and the depth
 * @returns An HTML document
 */
export function generateDocument(spec: GeneratorSpec, options: GenerateOptions): string {
	const generator = new Generator(spec, mulberry32(options.seed), options.elements, options.depth ?? 12);
	const body = generator.body(1);
	return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="utf-8"><title>generated</title></head><body>${body}</body></html>\n`;
}
