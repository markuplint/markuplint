/**
 * Whether the records of `diagnostics.ts` would notice a reader of the spec that gets a part of it wrong.
 *
 * A record that was taken from the current output proves only that the output is the output.
 * What a record is worth is the changes that it would show, and the way to know is to make the changes:
 * a mutation analysis (Jia & Harman, "An Analysis and Survey of the Development of Mutation Testing",
 * IEEE TSE 2011) changes the program one small place at a time and counts the changes that the tests
 * catch. Here the program under test is the data, a mutation is one small change of it (a flag,
 * an attribute, a member of a category, a pattern of a content model, an ARIA role), and a mutation is
 * killed when the record of some input differs. The mutations that survive are the places of the
 * data that no input makes any rule read: an input is added for each, or the place is one that
 * no rule reads, which is worth knowing as well.
 *
 * A mutation that kills nothing in a sample of thousands is no evidence that the place is unread:
 * the sample says how much of the data the inputs reach, and the survivors are where to look.
 *
 * @module
 */
import { FLAG_NAMES, roleName } from './layout.ts';
import { mulberry32 } from './stats.ts';

/** The parts of the data that a mutation reads and changes. */
export interface MutableSpec {
	def: { '#contentModels': Record<string, string[]> };
	specs: {
		name: string;
		contentModel?: { contents?: unknown };
		attributes?: Record<string, Record<string, unknown>>;
		aria?: { implicitRole?: unknown; permittedRoles?: unknown };
		[flag: string]: unknown;
	}[];
}

/** One small change of the data. */
export interface Mutation {
	/** The kind of change. */
	readonly operator: string;
	/** The place it changes, in the words of the data: `a[href].deprecated`, `#flow:div`. */
	readonly target: string;
	/** Changes a copy of the data. */
	readonly change: (spec: MutableSpec) => void;
}

/** The flags that an attribute can carry. */
const ATTRIBUTE_FLAGS = ['obsolete', 'deprecated', 'experimental', 'nonStandard'] as const;

/** What a pattern of a content model is changed to: the other bound of its count. */
const OTHER_BOUND: Readonly<Record<string, string>> = {
	require: 'optional',
	optional: 'require',
	oneOrMore: 'zeroOrMore',
	zeroOrMore: 'oneOrMore',
};

function find<T extends MutableSpec>(spec: T, name: string) {
	const element = spec.specs.find(item => item.name === name);
	if (!element) {
		throw new Error(`The data has no element "${name}"`);
	}
	return element;
}

/**
 * Lists the changes of the data, in a fixed order.
 *
 * @param spec - The data
 * @returns Every mutation, one for each place of each kind
 */
export function enumerateMutations(spec: MutableSpec): Mutation[] {
	const mutations: Mutation[] = [];

	for (const element of spec.specs) {
		const { name } = element;

		for (const flag of FLAG_NAMES) {
			mutations.push({
				operator: 'element-flag',
				target: `${name}.${flag}`,
				change: copy => {
					const target = find(copy, name);
					if (target[flag] === undefined) {
						target[flag] = true;
					} else {
						delete target[flag];
					}
				},
			});
		}

		for (const attribute of Object.keys(element.attributes ?? {})) {
			mutations.push({
				operator: 'attribute-delete',
				target: `${name}[${attribute}]`,
				change: copy => {
					delete find(copy, name).attributes?.[attribute];
				},
			});
			for (const flag of ATTRIBUTE_FLAGS) {
				mutations.push({
					operator: 'attribute-flag',
					target: `${name}[${attribute}].${flag}`,
					change: copy => {
						const target = find(copy, name).attributes?.[attribute];
						if (!target) {
							return;
						}
						if (target[flag] === undefined) {
							target[flag] = true;
						} else {
							delete target[flag];
						}
					},
				});
			}
		}

		const contents = element.contentModel?.contents;
		if (Array.isArray(contents)) {
			for (const [index, pattern] of contents.entries()) {
				mutations.push({
					operator: 'content-model-pattern',
					target: `${name}.contents[${index}]:drop`,
					change: copy => {
						const list = find(copy, name).contentModel?.contents;
						if (Array.isArray(list)) {
							list.splice(index, 1);
						}
					},
				});
				const key = Object.keys(pattern as object).find(candidate => candidate in OTHER_BOUND);
				if (key) {
					mutations.push({
						operator: 'content-model-pattern',
						target: `${name}.contents[${index}]:${key}->${OTHER_BOUND[key]}`,
						change: copy => {
							const list = find(copy, name).contentModel?.contents;
							if (Array.isArray(list) && list[index]) {
								const item = list[index] as Record<string, unknown>;
								list[index] = Object.fromEntries(
									Object.entries(item).map(([k, v]) => [k === key ? OTHER_BOUND[key] : k, v]),
								);
							}
						},
					});
				}
			}
		}

		if (typeof element.aria?.implicitRole === 'string') {
			mutations.push({
				operator: 'aria-implicit-role',
				target: `${name}.implicitRole`,
				change: copy => {
					const aria = find(copy, name).aria;
					if (aria) {
						aria.implicitRole = false;
					}
				},
			});
		}
		if (Array.isArray(element.aria?.permittedRoles)) {
			for (const item of element.aria.permittedRoles) {
				const role = roleName(item);
				if (role === null) {
					continue;
				}
				mutations.push({
					operator: 'aria-permitted-role',
					target: `${name}.permittedRoles:${role}`,
					change: copy => {
						const aria = find(copy, name).aria;
						if (aria && Array.isArray(aria.permittedRoles)) {
							aria.permittedRoles = aria.permittedRoles.filter(
								(candidate: unknown) => roleName(candidate) !== role,
							);
						}
					},
				});
			}
		}
	}

	for (const [category, members] of Object.entries(spec.def['#contentModels'])) {
		for (const member of members) {
			mutations.push({
				operator: 'category-member-delete',
				target: `${category}:${member}`,
				change: copy => {
					const list = copy.def['#contentModels'][category];
					if (list) {
						copy.def['#contentModels'][category] = list.filter(item => item !== member);
					}
				},
			});
		}
	}

	return mutations;
}

/**
 * Applies a mutation to a copy of the data.
 *
 * @template T - The type of the data
 * @param spec - The data, which is not changed
 * @param mutation - The change
 * @returns The copy, changed
 */
export function applyMutation<T extends MutableSpec>(spec: T, mutation: Mutation): T {
	const copy = structuredClone(spec);
	mutation.change(copy);
	return copy;
}

/**
 * Takes some of the mutations, the same ones for the same seed.
 *
 * @param mutations - All of them
 * @param count - How many to take
 * @param seed - The seed of the choice
 * @returns At most `count`, in the order of the list
 */
export function sample(mutations: readonly Mutation[], count: number, seed: number): Mutation[] {
	if (count >= mutations.length) {
		return [...mutations];
	}
	const random = mulberry32(seed);
	const order = mutations.map((_, index) => index);
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[order[i], order[j]] = [order[j] ?? 0, order[i] ?? 0];
	}
	return order
		.slice(0, count)
		.toSorted((a, b) => a - b)
		.map(index => mutations[index] as Mutation);
}

/** An input to run a mutation against. */
export interface MutationInput {
	readonly name: string;
	readonly html: string;
	readonly extendedSpec?: string;
}

/** What a run of a mutation shows. */
export interface MutationOutcome {
	readonly mutation: Mutation;
	/** The inputs whose record differs from the record of the data as it is. Empty when the mutation survived. */
	readonly killedBy: readonly string[];
}

/** What a run of the engine is given: the same as `diagnose` of `diagnostics.ts`. */
export interface RunOptions {
	readonly transformSpec?: (spec: never) => never;
	readonly extendedSpec?: string;
}

/**
 * Runs every mutation against every input.
 *
 * @param spec - The data
 * @param mutations - The changes to make, one at a time
 * @param inputs - The inputs
 * @param record - Lints an input and returns its record as text
 * @param onProgress - Called after each mutation, with how many are done and how many there are
 * @returns For each mutation, the inputs that noticed it. It throws when a run that changes nothing is told apart from the baseline
 */
export async function runMutations(
	spec: MutableSpec,
	mutations: readonly Mutation[],
	inputs: readonly MutationInput[],
	record: (html: string, options: RunOptions) => Promise<string>,
	onProgress?: (done: number, total: number) => void,
): Promise<MutationOutcome[]> {
	const baseline = new Map<string, string>();
	for (const input of inputs) {
		baseline.set(input.name, await record(input.html, { extendedSpec: input.extendedSpec }));
	}
	// A run that changes nothing must give the record of the data as it is. If it does not, the runs with a
	// replaced spec differ from the baseline for a reason of their own, and every mutation would look killed.
	for (const input of inputs) {
		const control = await record(input.html, {
			extendedSpec: input.extendedSpec,
			transformSpec: () => structuredClone(spec) as never,
		});
		if (control !== baseline.get(input.name)) {
			throw new Error(
				`The control run of "${input.name}" differs from its baseline with no change made: the analysis is not valid`,
			);
		}
	}
	const outcomes: MutationOutcome[] = [];
	for (const mutation of mutations) {
		const changed = applyMutation(spec, mutation);
		const killedBy: string[] = [];
		for (const input of inputs) {
			const got = await record(input.html, {
				extendedSpec: input.extendedSpec,
				transformSpec: () => changed as never,
			});
			if (got !== baseline.get(input.name)) {
				killedBy.push(input.name);
			}
		}
		outcomes.push({ mutation, killedBy });
		onProgress?.(outcomes.length, mutations.length);
	}
	return outcomes;
}

/**
 * Reports a run: how much was killed, for each kind, and what survived.
 *
 * @param outcomes - The outcomes of {@link runMutations}
 * @returns The text
 */
export function summarize(outcomes: readonly MutationOutcome[]): string {
	const killed = outcomes.filter(outcome => outcome.killedBy.length > 0);
	const lines = [`killed ${killed.length} of ${outcomes.length}`, ''];
	const operators = [...new Set(outcomes.map(outcome => outcome.mutation.operator))].toSorted();
	for (const operator of operators) {
		const ofKind = outcomes.filter(outcome => outcome.mutation.operator === operator);
		const killedOfKind = ofKind.filter(outcome => outcome.killedBy.length > 0).length;
		lines.push(`${operator}: killed ${killedOfKind} of ${ofKind.length}`);
	}
	lines.push('');
	for (const outcome of outcomes) {
		if (outcome.killedBy.length === 0) {
			lines.push(`survived: ${outcome.mutation.operator} ${outcome.mutation.target}`);
		}
	}
	return lines.join('\n');
}
