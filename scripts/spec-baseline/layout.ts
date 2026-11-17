/**
 * The questions a packed format has to answer, and the plainest bit layout that answers them.
 *
 * A format is judged by what a reader does with it, so the first thing to fix is the questions:
 * "does this element have this flag", "is this element in this category". They are asked of the
 * data as it is (objects), and of a layout in which the flags and the unconditional members of the
 * categories are bits. The layout is not a proposal for the format. It is the least that a
 * bit-based format can be, so that the cost of answering from bits is measured before a format
 * is designed, and so that the two answers can be compared question by question (a format that
 * answers differently is wrong, however fast).
 *
 * The layout is made of 32-bit words, little-endian, because the bit operators of JavaScript work
 * on 32-bit integers (a 64-bit word is a `BigInt` there, much slower). Everything here is derived
 * from the data by a rule that is stated in the code, so the same questions can be asked of another
 * reader of the same `index.json` and the answers compared.
 *
 * Only the members of a category that are the name of an element are bits. A member that is a selector
 * (`a[href]`, `hgroup:has(h1)`) is a predicate on the element and its context, and flattening it
 * to a set of tag names would change what a category means; a member that names no element of the data
 * (`#text`, `#custom`) is not an element either. Those are counted and left to the selector engine.
 *
 * @module
 */

/** The flags of an element, in the order of the bits of a flag word. */
export const FLAG_NAMES = ['obsolete', 'deprecated', 'nonStandard', 'experimental'] as const;

/**
 * The name of a role that an element permits: the data writes it as a string, or as an object that carries a flag
 * (`{ "name": "directory", "deprecated": true }`).
 *
 * @param role - An item of `aria.permittedRoles`
 * @returns The role's name, or `null` for an item that is neither
 */
export function roleName(role: unknown): string | null {
	if (typeof role === 'string') {
		return role;
	}
	if (typeof role === 'object' && role !== null && typeof (role as { name?: unknown }).name === 'string') {
		return (role as { name: string }).name;
	}
	return null;
}

/** What the layout reads of the data. */
export interface SpecLike {
	readonly def: { readonly '#contentModels': Readonly<Record<string, readonly string[]>> };
	readonly specs: readonly ({ readonly name: string } & Partial<Record<(typeof FLAG_NAMES)[number], boolean>>)[];
}

/** The bits of the data. */
export interface Layout {
	/** Element names, in the order of the data. The index of a name is the number of its bit. */
	readonly elements: readonly string[];
	/** Category names, sorted. The index of a name is the number of its row. */
	readonly categories: readonly string[];
	/** One word for each element: bit `i` is `FLAG_NAMES[i]`. */
	readonly flags: Uint32Array;
	/** 32-bit words in a row of `categoryBits`: `ceil(elements / 32)`. */
	readonly wordsPerRow: number;
	/** `categories.length` rows of `wordsPerRow` words: bit `e` of row `c` is set when element `e` is a plain-name member of category `c`. */
	readonly categoryBits: Uint32Array;
	/** For each category, how many of its members are not the name of an element (selectors, `#text`, `#custom`) and so not in the bits. */
	readonly conditional: Readonly<Record<string, number>>;
}

/**
 * Builds the layout.
 *
 * @param spec - The data of `@markuplint/html-spec`
 * @returns The bits
 */
export function buildLayout(spec: SpecLike): Layout {
	const elements = spec.specs.map(element => element.name);
	const index = new Map(elements.map((name, position) => [name, position]));
	const categories = Object.keys(spec.def['#contentModels']).toSorted();
	const wordsPerRow = Math.ceil(elements.length / 32);

	const flags = new Uint32Array(elements.length);
	for (const [position, element] of spec.specs.entries()) {
		let word = 0;
		for (const [bit, name] of FLAG_NAMES.entries()) {
			if (element[name] === true) {
				word |= 1 << bit;
			}
		}
		flags[position] = word >>> 0;
	}

	const categoryBits = new Uint32Array(categories.length * wordsPerRow);
	const conditional: Record<string, number> = {};
	for (const [row, category] of categories.entries()) {
		conditional[category] = 0;
		for (const member of spec.def['#contentModels'][category] ?? []) {
			const position = index.get(member);
			if (position === undefined) {
				// A selector, or a name of something that is not an element (`#text`, `#custom`).
				conditional[category] = (conditional[category] ?? 0) + 1;
				continue;
			}
			const at = row * wordsPerRow + (position >>> 5);
			categoryBits[at] = ((categoryBits[at] ?? 0) | (1 << (position & 31))) >>> 0;
		}
	}

	return { elements, categories, flags, wordsPerRow, categoryBits, conditional };
}

/** A question about one element. The numbers are indexes into the layout. */
export type Question =
	| { readonly kind: 'flag'; readonly element: number; readonly flag: number }
	| { readonly kind: 'category'; readonly element: number; readonly category: number };

/**
 * Every question the layout can answer, in a fixed order: the flags of each element, then the categories of each element.
 *
 * @param layout - The layout
 * @returns The questions
 */
export function questionsOf(layout: Layout): Question[] {
	const questions: Question[] = [];
	for (let element = 0; element < layout.elements.length; element++) {
		for (let flag = 0; flag < FLAG_NAMES.length; flag++) {
			questions.push({ kind: 'flag', element, flag });
		}
	}
	for (let element = 0; element < layout.elements.length; element++) {
		for (let category = 0; category < layout.categories.length; category++) {
			questions.push({ kind: 'category', element, category });
		}
	}
	return questions;
}

/**
 * Answers the questions from the data as objects.
 *
 * @param spec - The data
 * @param layout - The layout the questions' indexes refer to
 * @param questions - The questions
 * @returns 1 or 0 for each question
 */
export function askObject(spec: SpecLike, layout: Layout, questions: readonly Question[]): Uint8Array {
	const answers = new Uint8Array(questions.length);
	for (const [position, question] of questions.entries()) {
		const element = spec.specs[question.element];
		if (!element) {
			throw new Error(`There is no element ${question.element}`);
		}
		if (question.kind === 'flag') {
			const flag = FLAG_NAMES[question.flag];
			if (!flag) {
				throw new Error(`There is no flag ${question.flag}`);
			}
			answers[position] = element[flag] === true ? 1 : 0;
		} else {
			const category = layout.categories[question.category];
			if (category === undefined) {
				throw new Error(`There is no category ${question.category}`);
			}
			answers[position] = (spec.def['#contentModels'][category] ?? []).includes(element.name) ? 1 : 0;
		}
	}
	return answers;
}

/**
 * Checks that every question points at an element, a flag or a category that the layout has. `askBits` is a loop that
 * is timed, so it does not check, and an index that is out of range would read as an answer of 0 there: this is
 * called once before.
 *
 * @param layout - The layout
 * @param questions - The questions
 */
export function assertQuestions(layout: Layout, questions: readonly Question[]): void {
	for (const question of questions) {
		const inRange =
			question.element >= 0 &&
			question.element < layout.elements.length &&
			(question.kind === 'flag'
				? question.flag >= 0 && question.flag < FLAG_NAMES.length
				: question.category >= 0 && question.category < layout.categories.length);
		if (!inRange) {
			throw new Error(`A question points outside the layout: ${JSON.stringify(question)}`);
		}
	}
}

/**
 * Answers the questions from the bits.
 *
 * @param layout - The layout
 * @param questions - The questions
 * @returns 1 or 0 for each question
 */
export function askBits(layout: Layout, questions: readonly Question[]): Uint8Array {
	const answers = new Uint8Array(questions.length);
	const { flags, categoryBits, wordsPerRow } = layout;
	for (let position = 0; position < questions.length; position++) {
		const question = questions[position];
		if (!question) {
			continue;
		}
		if (question.kind === 'flag') {
			answers[position] = ((flags[question.element] ?? 0) >>> question.flag) & 1;
		} else {
			const word = categoryBits[question.category * wordsPerRow + (question.element >>> 5)] ?? 0;
			answers[position] = (word >>> (question.element & 31)) & 1;
		}
	}
	return answers;
}
