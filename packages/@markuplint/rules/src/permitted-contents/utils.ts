import type { ChildNode, Hints, MissingNodeReason, RepeatSign, Specs } from './types.js';
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

export function matches(
	selector: string,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ChildNode,
	specs: Specs,
) {
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
}

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
			selectorResult = dep;
			continue;
		}
		break;
	}
	return nodes;
}

export function isRequire(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentRequire> {
	return 'require' in content;
}

export function isOptional(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentOptional> {
	return 'optional' in content;
}

export function isOneOrMore(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentOneOrMore> {
	return 'oneOrMore' in content;
}

export function isZeroOrMore(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentZeroOrMore> {
	return 'zeroOrMore' in content;
}

export function isChoice(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentChoice> {
	return 'choice' in content;
}

export function isTransparent(
	content: ReadonlyDeep<PermittedContentPattern>,
): content is ReadonlyDeep<PermittedContentTransparent> {
	return 'transparent' in content;
}

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

export function mergeHints(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	a: Readonly<Hints>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	b: Readonly<Hints>,
) {
	const missing = [a.missing, b.missing].sort(
		(a, b) => (b?.barelyMatchedElements ?? 0) - (a?.barelyMatchedElements ?? 0),
	)[0];
	return cleanObject({
		...a,
		...b,
		missing: missing && cleanObject(missing),
	});
}

export function cleanObject<T extends Object>(object: T): Partial<T> {
	const newObject: Partial<T> = {};
	for (const [key, value] of Object.entries(object)) {
		if (value !== undefined) {
			newObject[key as keyof T] = value;
		}
	}
	return newObject;
}

export class Collection {
	#locked: ReadonlySet<ChildNode> = new Set();
	#matched: Set<ChildNode> = new Set();
	#nodes: ReadonlySet<ChildNode>;
	#origin: readonly ChildNode[];

	constructor(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		origin: readonly ChildNode[],
	) {
		this.#origin = [...origin];
		this.#nodes = new Set(this.#origin);
	}

	get matched() {
		return [...this.#matched];
	}

	get matchedCount() {
		return this.#matched.size;
	}

	get nodes() {
		return [...this.#origin];
	}

	get unmatched() {
		return [...this.#nodes].filter(n => !this.#matched.has(n));
	}

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

	back() {
		this.#matched = new Set(this.#locked);
	}

	lock() {
		this.#locked = new Set(this.#matched);
	}

	max(max: number) {
		const sliced = [...this.#matched].slice(max);
		for (const n of sliced) this.#matched.delete(n);
	}

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

export class UnsupportedError extends Error {}

export function modelLog(model: ReadonlyDeep<Model | PermittedContentPattern[]>, repeat: RepeatSign): string {
	if (!isModel(model)) {
		return orderLog(model, repeat);
	}
	if (typeof model === 'string') {
		return `<${model}>${repeat}`;
	}
	return `(<${model.join('>|<')}>)${repeat}`;
}

function orderLog(order: ReadonlyDeep<PermittedContentPattern[]>, repeat: RepeatSign) {
	return order.length === 1 && order[0]
		? markRepeat(patternLog(order[0]), repeat)
		: markRepeat(order.map(pattern => patternLog(pattern)).join(''), repeat);
}

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

function markRepeat(pattern: string, repeat: RepeatSign) {
	return repeat ? `(${pattern})${repeat}` : pattern;
}
