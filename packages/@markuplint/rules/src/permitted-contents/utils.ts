import type { ChildNode, Hints, MissingNodeReason, Mode, RepeatSign, Specs } from './types.js';
import type {
	PermittedContentPattern,
	PermittedContentChoice,
	PermittedContentOneOrMore,
	PermittedContentOptional,
	PermittedContentRequire,
	PermittedContentTransparent,
	PermittedContentZeroOrMore,
	Model,
	MLMLSpec,
} from '@markuplint/ml-spec';
import type { SelectorMatchedResult } from '@markuplint/selector';
import type { ReadonlyDeep } from 'type-fest';

import { createSelector } from '@markuplint/selector';

import { bgGreen, green, bgRed, bgBlue, blue, bgMagenta, cyan } from './debug.js';
import { transparentMode } from './represent-transparent-nodes.js';

/**
 * Determines whether a given value is a terminal model (a selector string or an array
 * of selector strings) rather than a nested array of content model patterns.
 * Distinguishes between `Model` (leaf-level selectors) and `PermittedContentPattern[]`
 * (structural pattern arrays that require further recursive evaluation).
 *
 * @param model - The value to check, either a terminal model or a nested pattern array.
 * @returns True if the value is a terminal model (string or string array), false if it is a pattern array.
 */
export function isModel(model: ReadonlyDeep<Model | PermittedContentPattern[]>): model is ReadonlyDeep<Model> {
	if (typeof model === 'string') {
		return true;
	}
	let modelMode = false;
	for (const m of model) {
		if (typeof m === 'string') {
			modelMode = true;
			continue;
		}
		if (modelMode) {
			throw new TypeError(`Invalid schema: ${JSON.stringify(model)}`);
		}
	}
	return modelMode;
}

/**
 * Tests whether a child node matches a CSS selector string using the markuplint
 * selector engine. Returns whether the node matched and, if not, the deepest
 * unmatched descendant node for diagnostic purposes.
 *
 * When `mode === 'origin'` and the node has an active pretender context, the
 * context is temporarily suppressed so that the selector engine reads the
 * element's original AST identity (`rawName` / original attrs) instead of the
 * pretender target. The mutation mirrors the pattern already used by
 * `MLElement.matchMLSelector` and is safe because the selector engine runs
 * synchronously — the original context is restored in `finally` before the
 * call returns.
 *
 * @param selector - The CSS selector string to test against.
 * @param node - The child node to test.
 * @param specs - The spec data passed to the selector engine for attribute resolution.
 * @param mode - Which identity to match against (`'pretended'` is the default view).
 * @returns An object with `matched: true` if the node matches, or `matched: false` with an optional `not` node.
 */
export function matches(
	selector: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode,
	specs: Specs,
	mode: Mode,
) {
	let savedPretenderContext: ReturnType<typeof suppressPretender> = null;
	if (mode === 'origin') {
		savedPretenderContext = suppressPretender(node);
	}
	try {
		const selectorResult = createSelector(selector, specs as MLMLSpec).search(node);

		const matched = selectorResult.filter((r): r is SelectorMatchedResult => r.matched);

		if (matched.length > 0) {
			return {
				matched: true,
			};
		}

		const not = selectorResult
			.flatMap(r => (r.matched ? [] : (r.not ?? [])))
			.flatMap(descendants)
			.shift();

		return {
			matched: false,
			not,
		};
	} finally {
		if (savedPretenderContext) {
			restorePretender(node, savedPretenderContext);
		}
	}
}

/**
 * Temporarily hides the pretender context on an element so that selector
 * matching sees its original AST identity. Returns the saved context for
 * later restoration, or `null` if the node is not an element with an active
 * pretender.
 */
function suppressPretender(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode,
) {
	if (!node.is(node.ELEMENT_NODE)) {
		return null;
	}
	const pretenderContext = node.pretenderContext;
	if (pretenderContext?.type !== 'pretender') {
		return null;
	}
	node.pretenderContext = null;
	return pretenderContext;
}

/**
 * Restores a pretender context previously saved by {@link suppressPretender}.
 */
function restorePretender(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode,
	saved: NonNullable<ReturnType<typeof suppressPretender>>,
) {
	if (node.is(node.ELEMENT_NODE)) {
		node.pretenderContext = saved;
	}
}

/**
 * Traverses a chain of nested `:has()` selector results to find the deepest
 * descendant nodes that caused a selector mismatch. Used to provide precise
 * error reporting by identifying the actual offending node in nested selectors.
 *
 * @param selectorResult - A matched selector result that may contain nested `:has()` results.
 * @returns The deepest descendant child nodes from the nested selector chain.
 */
function descendants(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	selectorResult: SelectorMatchedResult,
): ChildNode[] {
	let nodes: ChildNode[] = [...selectorResult.nodes] as ChildNode[];
	while (selectorResult.has.length > 0) {
		for (const dep of selectorResult.has) {
			if (dep.has.length === 0) {
				nodes = dep.nodes as ChildNode[];
				continue;
			}
			// eslint-disable-next-line no-useless-assignment
			selectorResult = dep;
			continue;
		}
		break;
	}
	return nodes;
}

/**
 * Type guard that checks whether a content model pattern is a "require" pattern,
 * indicating one or more required occurrences of a specific element or model.
 *
 * @param content - The content model pattern to check.
 * @returns True if the pattern has a `require` property.
 */
export function isRequire(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentRequire> {
	return 'require' in content;
}

/**
 * Type guard that checks whether a content model pattern is an "optional" pattern,
 * indicating zero or one occurrences of a specific element or model.
 *
 * @param content - The content model pattern to check.
 * @returns True if the pattern has an `optional` property.
 */
export function isOptional(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentOptional> {
	return 'optional' in content;
}

/**
 * Type guard that checks whether a content model pattern is a "oneOrMore" pattern,
 * indicating one or more occurrences of a specific element or model.
 *
 * @param content - The content model pattern to check.
 * @returns True if the pattern has a `oneOrMore` property.
 */
export function isOneOrMore(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentOneOrMore> {
	return 'oneOrMore' in content;
}

/**
 * Type guard that checks whether a content model pattern is a "zeroOrMore" pattern,
 * indicating zero or more occurrences of a specific element or model.
 *
 * @param content - The content model pattern to check.
 * @returns True if the pattern has a `zeroOrMore` property.
 */
export function isZeroOrMore(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentZeroOrMore> {
	return 'zeroOrMore' in content;
}

/**
 * Type guard that checks whether a content model pattern is a "choice" pattern,
 * representing an alternation between multiple possible content model branches.
 *
 * @param content - The content model pattern to check.
 * @returns True if the pattern has a `choice` property.
 */
export function isChoice(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentChoice> {
	return 'choice' in content;
}

/**
 * Type guard that checks whether a content model pattern is a "transparent" pattern,
 * indicating the element inherits its parent's content model.
 *
 * @param content - The content model pattern to check.
 * @returns True if the pattern has a `transparent` property.
 */
export function isTransparent(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentTransparent> {
	return 'transparent' in content;
}

/**
 * Normalizes a quantified content model pattern (require, optional, oneOrMore, or zeroOrMore)
 * into a uniform representation with the inner model, minimum count, maximum count,
 * a regex-like repeat sign for debug display, and the appropriate missing-node error type.
 *
 * @param pattern - A quantified content model pattern to normalize.
 * @returns An object with `model`, `min`, `max`, `repeat` sign, and optional `missingType`.
 */
export function normalizeModel(
	pattern:
		| ReadonlyDeep<PermittedContentRequire>
		| ReadonlyDeep<PermittedContentOptional>
		| ReadonlyDeep<PermittedContentOneOrMore>
		| ReadonlyDeep<PermittedContentZeroOrMore>,
) {
	let model: ReadonlyDeep<Model | PermittedContentPattern[]>;
	let min: number;
	let max: number;
	let repeat: RepeatSign;
	let missingType: MissingNodeReason | undefined;

	if (isRequire(pattern)) {
		model = pattern.require;
		min = pattern.min ?? 1;
		max = Math.max(pattern.max ?? 1, min);
		missingType = 'MISSING_NODE_REQUIRED';
	} else if (isOptional(pattern)) {
		model = pattern.optional;
		min = 0;
		max = Math.max(pattern.max ?? 1, 1);
	} else if (isOneOrMore(pattern)) {
		model = pattern.oneOrMore;
		min = 1;
		max = Math.max(pattern.max ?? Number.POSITIVE_INFINITY, 1);
		missingType = 'MISSING_NODE_ONE_OR_MORE';
	} else if (isZeroOrMore(pattern)) {
		model = pattern.zeroOrMore;
		min = 0;
		max = Math.max(pattern.max ?? Number.POSITIVE_INFINITY, 1);
	} else {
		throw new Error('Unreachable code');
	}

	if (min === 0 && max === 1) {
		repeat = '?';
	} else if (min === 0 && !Number.isFinite(max)) {
		repeat = '*';
	} else if (min === 1 && max === 1) {
		repeat = '';
	} else if (min === 1 && !Number.isFinite(max)) {
		repeat = '+';
	} else {
		repeat = `{${min},${max}}`;
	}

	return {
		model,
		min,
		max,
		repeat,
		missingType,
	};
}

/**
 * Merges two Hints objects, combining their properties and selecting the
 * `missing` hint with the higher `barelyMatchedElements` count (i.e., the
 * one closest to a successful match) for the most useful error diagnostics.
 *
 * @param a - The first hints object.
 * @param b - The second hints object.
 * @returns A merged hints object with undefined properties removed.
 */
export function mergeHints(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	a: Readonly<Hints>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	b: Readonly<Hints>,
) {
	const missing = [a.missing, b.missing].toSorted(
		(a, b) => (b?.barelyMatchedElements ?? 0) - (a?.barelyMatchedElements ?? 0),
	)[0];
	return cleanObject({
		...a,
		...b,
		missing: missing && cleanObject(missing),
	});
}

/**
 * Creates a shallow copy of an object with all `undefined` values removed.
 * Used to produce clean hint objects for result reporting without
 * extraneous undefined properties.
 *
 * @template T - The object type.
 * @param object - The source object to clean.
 * @returns A new object containing only the defined properties of the input.
 */
export function cleanObject<T extends object>(object: T): Partial<T> {
	const newObject: Partial<T> = {};
	for (const [key, value] of Object.entries(object)) {
		if (value !== undefined) {
			newObject[key as keyof T] = value;
		}
	}
	return newObject;
}

/**
 * Tracks matched and unmatched child nodes during content model validation.
 * Provides operations for adding matched nodes, backtracking to a locked state,
 * capping matches at a maximum count, and generating colored debug output.
 *
 * The collection maintains an ordered set of original nodes and partitions them
 * into matched and unmatched sets as the validation algorithm progresses.
 */
export class Collection {
	#locked: ReadonlySet<ChildNode> = new Set();
	#matched: Set<ChildNode> = new Set();
	#nodes: ReadonlySet<ChildNode>;
	#origin: readonly ChildNode[];

	/**
	 * Creates a new Collection from the given child nodes.
	 *
	 * @param origin - The initial list of child nodes to track.
	 */
	constructor(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		origin: readonly ChildNode[],
	) {
		this.#origin = [...origin];
		this.#nodes = new Set(this.#origin);
	}

	/**
	 * Returns a copy of the currently matched nodes in insertion order.
	 */
	get matched() {
		return [...this.#matched];
	}

	/**
	 * Returns the number of currently matched nodes.
	 */
	get matchedCount() {
		return this.#matched.size;
	}

	/**
	 * Returns a copy of all original nodes in their original order.
	 */
	get nodes() {
		return [...this.#origin];
	}

	/**
	 * Returns the nodes that have not yet been matched, preserving original order.
	 */
	get unmatched() {
		return [...this.#nodes].filter(n => !this.#matched.has(n));
	}

	/**
	 * Adds nodes to the matched set. All nodes must belong to the original
	 * collection; external nodes will cause a ReferenceError.
	 *
	 * @param nodes - The child nodes to mark as matched.
	 * @returns True if the matched set grew (new nodes were added), false otherwise.
	 */
	addMatched(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		nodes: ChildNode[],
	) {
		const i = this.#matched.size;

		for (const node of nodes) {
			if (!this.#nodes.has(node)) {
				throw new ReferenceError(`External Node: ${node.nodeName}`);
			}

			this.#matched.add(node);
		}

		return i < this.#matched.size;
	}

	/**
	 * Reverts the matched set to the last locked state, discarding
	 * any matches added since the last `lock()` call. Used for backtracking
	 * when a pattern match attempt fails after a zero-match.
	 */
	back() {
		this.#matched = new Set(this.#locked);
	}

	/**
	 * Saves the current matched set as a checkpoint that `back()` can
	 * revert to. Called after a successful backtrack recovery to preserve
	 * the known-good state.
	 */
	lock() {
		this.#locked = new Set(this.#matched);
	}

	/**
	 * Trims the matched set to at most `max` entries by removing
	 * the most recently added nodes beyond the limit. Used when the
	 * maximum occurrence count for a pattern is exceeded.
	 *
	 * @param max - The maximum number of matched nodes to retain.
	 */
	max(max: number) {
		const sliced = [...this.#matched].slice(max);
		for (const n of sliced) this.#matched.delete(n);
	}

	/**
	 * Returns a colored string representation of all nodes for debug logging.
	 * Matched nodes are shown in green, locked nodes in bold green, unmatched
	 * extra nodes in red (when highlighted), and transparent-mode nodes in
	 * blue/cyan/magenta variants.
	 *
	 * @param highlightExtraNodes - When true, unmatched nodes are highlighted in red/magenta.
	 * @returns A formatted string like `[ <div>, <span>, <p> ]` with ANSI colors.
	 */
	toString(highlightExtraNodes = false) {
		const out: string[] = [];
		for (const n of this.#origin) {
			const raw = n.is(n.TEXT_NODE) ? `:text(${n.raw.replaceAll('\n', '\\n')})` : n.raw;
			if (this.#locked.has(n)) {
				if (transparentMode.has(n)) {
					out.push(bgBlue.bold(raw));
				} else {
					out.push(bgGreen.bold(raw));
				}
				continue;
			}
			if (this.#matched.has(n)) {
				if (transparentMode.has(n)) {
					out.push(blue.bold(raw));
				} else {
					out.push(green.bold(raw));
				}
				continue;
			}
			if (highlightExtraNodes) {
				if (transparentMode.has(n)) {
					out.push(bgMagenta.bold(raw));
				} else {
					out.push(bgRed.bold(raw));
				}
				continue;
			}
			if (transparentMode.has(n)) {
				out.push(cyan(raw));
			} else {
				out.push(raw);
			}
		}
		return `[ ${out.join(', ')} ]`;
	}
}

/**
 * Error class representing an unsupported content model feature.
 * Thrown when the validation engine encounters a pattern type or
 * configuration that is not yet implemented.
 */
export class UnsupportedError extends Error {}

/**
 * Formats a content model (terminal model or pattern array) and its repeat sign
 * into a regex-like string for debug logging output. Terminal selectors are
 * rendered as `<selector>`, arrays of selectors as `(<s1>|<s2>)`, and
 * nested patterns are recursively formatted.
 *
 * @param model - The model or pattern array to format.
 * @param repeat - The quantifier sign to append (e.g., `+`, `*`, `?`, or `{m,n}`).
 * @returns A human-readable regex-like string representation of the model.
 */
export function modelLog(model: ReadonlyDeep<Model | PermittedContentPattern[]>, repeat: RepeatSign): string {
	if (!isModel(model)) {
		return orderLog(model, repeat);
	}
	if (typeof model === 'string') {
		return `<${model}>${repeat}`;
	}
	return `(<${model.join('>|<')}>)${repeat}`;
}

/**
 * Formats an ordered array of content model patterns into a regex-like
 * string for debug logging, with an optional repeat quantifier wrapping
 * the entire sequence.
 *
 * @param order - The ordered array of patterns to format.
 * @param repeat - The quantifier sign to wrap around the sequence.
 * @returns A formatted string representation of the ordered patterns.
 */
function orderLog(order: ReadonlyDeep<PermittedContentPattern[]>, repeat: RepeatSign) {
	return order.length === 1 && order[0]
		? markRepeat(patternLog(order[0]), repeat)
		: markRepeat(order.map(pattern => patternLog(pattern)).join(''), repeat);
}

/**
 * Formats a single content model pattern into a regex-like string for debug logging.
 * Handles transparent, choice, and quantified patterns by dispatching to the
 * appropriate formatting logic.
 *
 * @param pattern - The content model pattern to format.
 * @returns A human-readable string representation of the pattern.
 */
function patternLog(pattern: ReadonlyDeep<PermittedContentPattern>): string {
	if (isTransparent(pattern)) {
		// 適当
		return `:transparent(${modelLog(pattern.transparent, '')})`;
	}

	if (isChoice(pattern)) {
		return `(${pattern.choice.map(candidate => orderLog(candidate, '')).join('|')})`;
	}

	const { model, repeat } = normalizeModel(pattern);
	return modelLog(model, repeat);
}

/**
 * Wraps a pattern string with parentheses and a repeat quantifier if a
 * repeat sign is present. If no repeat sign is given, returns the pattern unchanged.
 *
 * @param pattern - The pattern string to wrap.
 * @param repeat - The quantifier sign to append, or an empty string for no repetition.
 * @returns The pattern string, optionally wrapped as `(pattern)quantifier`.
 */
function markRepeat(pattern: string, repeat: RepeatSign) {
	return repeat ? `(${pattern})${repeat}` : pattern;
}
