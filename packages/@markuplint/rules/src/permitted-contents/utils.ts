import type { ChildNode, Element, Specs } from './types';
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

import { createSelector } from '@markuplint/selector';

import { bgGreen, green, bgRed, bgBlue, blue, bgMagenta, cyan } from './debug';
import { transparentMode } from './represent-transparent-nodes';

const getChildNodesWithoutWhitespacesCaches = new Map<Element, ChildNode[]>();
export function getChildNodesWithoutWhitespaces(el: Element): ChildNode[] {
	let nodes = getChildNodesWithoutWhitespacesCaches.get(el);
	if (nodes) {
		return nodes;
	}
	nodes = Array.from(el.childNodes).filter(node => {
		return !(node.is(node.TEXT_NODE) && node.isWhitespace());
	});
	getChildNodesWithoutWhitespacesCaches.set(el, nodes);
	return nodes;
}

export function isModel(model: Model | PermittedContentPattern[]): model is Model {
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

export function matches(selector: string, node: ChildNode, specs: Specs) {
	const selectorResult = createSelector(selector, specs as MLMLSpec).search(node);

	const matched = selectorResult.filter((r): r is SelectorMatchedResult => r.matched);

	if (matched.length) {
		return {
			matched: true,
		};
	}

	const not = selectorResult
		.map(r => (r.matched ? [] : r.not ?? []))
		.flat()
		.map(descendants)
		.flat()
		.shift();

	return {
		matched: false,
		not,
	};
}

function descendants(selectorResult: SelectorMatchedResult): ChildNode[] {
	let nodes: ChildNode[] = selectorResult.nodes.slice() as ChildNode[];
	while (selectorResult.has.length) {
		for (const dep of selectorResult.has) {
			if (!dep.has.length) {
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

export function isRequire(content: PermittedContentPattern): content is PermittedContentRequire {
	return 'require' in content;
}

export function isOptional(content: PermittedContentPattern): content is PermittedContentOptional {
	return 'optional' in content;
}

export function isOneOrMore(content: PermittedContentPattern): content is PermittedContentOneOrMore {
	return 'oneOrMore' in content;
}

export function isZeroOrMore(content: PermittedContentPattern): content is PermittedContentZeroOrMore {
	return 'zeroOrMore' in content;
}

export function isChoice(content: PermittedContentPattern): content is PermittedContentChoice {
	return 'choice' in content;
}

export function isTransparent(content: PermittedContentPattern): content is PermittedContentTransparent {
	return 'transparent' in content;
}

export class Collection {
	#locked: ReadonlySet<ChildNode> = new Set();
	#matched: Set<ChildNode> = new Set();
	#nodes: ReadonlySet<ChildNode>;
	#origin: readonly ChildNode[];

	constructor(origin: readonly ChildNode[]) {
		this.#origin = origin.slice();
		this.#nodes = new Set(this.#origin);
	}

	get matched() {
		return Array.from(this.#matched);
	}

	get matchedCount() {
		return this.#matched.size;
	}

	get nodes() {
		return this.#origin.slice();
	}

	get unmatched() {
		return Array.from(this.#nodes).filter(n => !this.#matched.has(n));
	}

	addMatched(nodes: ChildNode[]) {
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
		const sliced = Array.from(this.#matched).slice(max);
		sliced.forEach(n => this.#matched.delete(n));
	}

	toString(highlightExtraNodes = false) {
		const out: string[] = [];
		for (const n of this.#origin) {
			const raw = n.is(n.TEXT_NODE) ? `:text(${n.raw.replace(/\n/g, '\\n')})` : n.raw;
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
