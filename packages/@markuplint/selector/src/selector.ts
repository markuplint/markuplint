import type { SelectorMatchedResult, SelectorResult, Specificity } from './types.js';
import type { ReadonlyDeep, Writable } from 'type-fest';

import { resolveNamespace } from '@markuplint/ml-spec';
import parser from 'postcss-selector-parser';

import { compareSpecificity } from './compare-specificity.js';
import { log as coreLog } from './debug.js';
import { InvalidSelectorError } from './invalid-selector-error.js';
import { isElement, isNonDocumentTypeChildNode, isPureHTMLElement } from './is.js';

const selLog = coreLog.extend('selector');
const resLog = coreLog.extend('result');

type ExtendedPseudoClass = Readonly<
	Record<
		string,
		(content: string) => (
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			el: Element,
		) => SelectorResult
	>
>;

export class Selector {
	#ruleset: Ruleset;

	constructor(selector: string, extended: ExtendedPseudoClass = {}) {
		this.#ruleset = Ruleset.parse(selector, extended);
	}

	match(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		el: Node,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope?: ParentNode | null,
	): Specificity | false {
		scope = scope ?? (isElement(el) ? el : null);
		const results = this.search(el, scope);
		for (const result of results) {
			if (result.matched) {
				return result.specificity;
			}
		}
		return false;
	}

	search(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		el: Node,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope?: ParentNode | null,
	) {
		scope = scope ?? (isElement(el) ? el : null);
		return this.#ruleset.match(el, scope);
	}
}

class Ruleset {
	static parse(selector: string, extended: ExtendedPseudoClass) {
		const selectors: parser.Selector[] = [];
		try {
			parser(root => {
				selectors.push(...root.nodes);
			}).processSync(selector);
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new InvalidSelectorError(selector);
			}
			throw error;
		}
		return new Ruleset(selectors, extended, 0);
	}

	readonly headCombinator: string | null;
	#selectorGroup: StructuredSelector[] = [];

	constructor(selectors: ReadonlyDeep<parser.Selector[]>, extended: ExtendedPseudoClass, depth: number) {
		this.#selectorGroup.push(...selectors.map(selector => new StructuredSelector(selector, depth, extended)));
		const head = this.#selectorGroup[0];
		this.headCombinator = head?.headCombinator ?? null;

		if (this.headCombinator && depth <= 0) {
			if (this.#selectorGroup[0]?.selector) {
				throw new InvalidSelectorError(this.#selectorGroup[0]?.selector);
			}
			throw new Error('Combinated selector depth is not expected');
		}
	}

	match(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		el: Node,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope: ParentNode | null,
	): SelectorResult[] {
		if (coreLog.enabled) {
			coreLog(
				'<%s> (%s)',
				isElement(el) ? el.localName : el.nodeName,
				scope ? (isElement(scope) ? scope.localName : scope.nodeName) : null,
			);
		}
		return this.#selectorGroup.map(selector => {
			if (selLog.enabled) {
				selLog('"%s"', selector.selector);
			}
			const res = selector.match(el, scope);
			if (resLog.enabled) {
				resLog('%s "%s" => %o', isElement(el) ? el.localName : el.nodeName, selector.selector, res);
			}
			return res;
		});
	}
}

class StructuredSelector {
	#edge: SelectorTarget;
	readonly headCombinator: string | null;
	#selector: ReadonlyDeep<parser.Selector>;

	constructor(selector: ReadonlyDeep<parser.Selector>, depth: number, extended: ExtendedPseudoClass) {
		this.#selector = selector;
		this.#edge = new SelectorTarget(extended, depth);
		this.headCombinator =
			this.#selector.nodes[0]?.type === 'combinator' ? (this.#selector.nodes[0].value ?? null) : null;
		const nodes = [...this.#selector.nodes];
		if (0 < depth && this.headCombinator) {
			nodes.unshift(parser.pseudo({ value: ':scope' }));
		}
		for (const node of nodes) {
			switch (node.type) {
				case 'combinator': {
					const combinedTarget = new SelectorTarget(extended, depth);
					combinedTarget.from(this.#edge, node);
					this.#edge = combinedTarget;
					break;
				}
				case 'root':
				case 'string': {
					throw new Error(`Unsupported selector: ${selector.toString()}`);
				}
				case 'nesting': {
					throw new Error(`Unsupported nested selector: ${selector.toString()}`);
				}
				case 'comment': {
					throw new Error(`Unsupported comment in selector: ${selector.toString()}`);
				}
				default: {
					this.#edge.add(node);
				}
			}
		}
	}

	get selector() {
		return this.#selector.nodes.join('');
	}

	match(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		el: Node,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope: ParentNode | null,
	): SelectorResult {
		return this.#edge.match(el, scope, 0);
	}
}

class SelectorTarget {
	attr: ReadonlyDeep<parser.Attribute>[] = [];
	class: ReadonlyDeep<parser.ClassName>[] = [];
	#combinedFrom: {
		target: ReadonlyDeep<SelectorTarget>;
		combinator: ReadonlyDeep<parser.Combinator>;
	} | null = null;

	readonly depth: number;
	#extended: ExtendedPseudoClass;
	id: ReadonlyDeep<parser.Identifier>[] = [];
	#isAdded = false;
	pseudo: ReadonlyDeep<parser.Pseudo>[] = [];
	tag: ((ReadonlyDeep<parser.Tag> | ReadonlyDeep<parser.Universal>) & { _namespace?: string }) | null = null;

	constructor(extended: ExtendedPseudoClass, depth: number) {
		this.#extended = extended;
		this.depth = depth;
	}

	add(
		selector:
			| ReadonlyDeep<parser.Tag>
			| ReadonlyDeep<parser.Identifier>
			| ReadonlyDeep<parser.ClassName>
			| ReadonlyDeep<parser.Attribute>
			| ReadonlyDeep<parser.Universal>
			| ReadonlyDeep<parser.Pseudo>,
	) {
		this.#isAdded = true;
		switch (selector.type) {
			case 'tag':
			case 'universal': {
				this.tag = selector;
				break;
			}
			case 'id': {
				this.id.push(selector);
				break;
			}
			case 'class': {
				this.class.push(selector);
				break;
			}
			case 'attribute': {
				this.attr.push(selector);
				break;
			}
			case 'pseudo': {
				this.pseudo.push(selector);
				break;
			}
		}
	}

	from(target: ReadonlyDeep<SelectorTarget>, combinator: ReadonlyDeep<parser.Combinator>) {
		this.#combinedFrom = { target, combinator };
	}

	match(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		el: Node,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope: ParentNode | null,
		count: number,
	): SelectorResult {
		const result = this._match(el, scope, count);
		if (selLog.enabled) {
			const nodeName = el.nodeName;
			const selector = this.#combinedFrom?.target.toString() ?? this.toString();
			const combinator = result.combinator ? ` ${result.combinator}` : '';
			selLog('The %s element by "%s" => %s (%d)', nodeName, `${selector}${combinator}`, result.matched, count);
			if (selector === ':scope') {
				selLog(`† Scope is the ${scope?.nodeName ?? null}`);
			}
		}
		delete result.combinator;
		return result;
	}

	toString() {
		return [
			this.tag?.toString() ?? '',
			this.id.map(id => `#${id.value}`).join(''),
			this.class.map(c => `.${c.value}`).join(''),
			this.attr.map(attr => `[${attr.toString()}]`).join(''),
			this.pseudo.map(pseudo => pseudo.value).join(''),
		].join('');
	}

	private _match(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		el: Node,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope: ParentNode | null,
		count: number,
	): SelectorResult & { combinator?: string } {
		const unitCheck = this._matchWithoutCombineChecking(el, scope);
		if (!unitCheck.matched) {
			return unitCheck;
		}
		if (!this.#combinedFrom) {
			return unitCheck;
		}
		if (!isNonDocumentTypeChildNode(el)) {
			return unitCheck;
		}
		const { target, combinator } = this.#combinedFrom;
		switch (combinator.value) {
			// Descendant combinator
			case ' ': {
				const matchedNodes: (Element | Text)[] = [];
				const has: SelectorMatchedResult[] = [];
				const not: SelectorMatchedResult[] = [];
				let ancestor = el.parentElement;
				let specificity: Specificity | undefined = undefined;
				while (ancestor) {
					const res = target.match(ancestor, scope, count + 1);
					if (!specificity) {
						specificity = [
							unitCheck.specificity[0] + res.specificity[0],
							unitCheck.specificity[1] + res.specificity[1],
							unitCheck.specificity[2] + res.specificity[2],
						];
					}
					if (res.matched) {
						matchedNodes.push(...res.nodes);
						has.push(...res.has);
					} else {
						if (res.not) {
							not.push(...res.not);
						}
					}
					ancestor = ancestor.parentElement;
				}
				if (!specificity) {
					const res = target.match(el, scope, count + 1);
					specificity = [
						unitCheck.specificity[0] + res.specificity[0],
						unitCheck.specificity[1] + res.specificity[1],
						unitCheck.specificity[2] + res.specificity[2],
					];
				}
				if (matchedNodes.length > 0) {
					return {
						combinator: '␣',
						specificity,
						matched: true,
						nodes: matchedNodes,
						has,
					};
				}
				return {
					combinator: '␣',
					specificity,
					matched: false,
					not,
				};
			}
			// Child combinator
			case '>': {
				const matchedNodes: (Element | Text)[] = [];
				const has: SelectorMatchedResult[] = [];
				const not: SelectorMatchedResult[] = [];
				const specificity: Writable<Specificity> = [...unitCheck.specificity];
				const parentNode = el.parentElement;

				if (parentNode) {
					const res = target.match(parentNode, scope, count + 1);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					if (res.matched) {
						matchedNodes.push(...res.nodes);
						has.push(...res.has);
					} else {
						if (res.not) {
							not.push(...res.not);
						}
					}
				} else {
					const res = target.match(el, scope, count + 1);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
				}
				if (matchedNodes.length > 0) {
					return {
						combinator: '>',
						specificity,
						matched: true,
						nodes: matchedNodes,
						has,
					};
				}
				return {
					combinator: '>',
					specificity,
					matched: false,
					not,
				};
			}
			// Next-sibling combinator
			case '+': {
				const matchedNodes: (Element | Text)[] = [];
				const has: SelectorMatchedResult[] = [];
				const not: SelectorMatchedResult[] = [];
				const specificity: Writable<Specificity> = [...unitCheck.specificity];

				if (el.previousElementSibling) {
					const res = target.match(el.previousElementSibling, scope, count + 1);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					if (res.matched) {
						matchedNodes.push(...res.nodes);
						has.push(...res.has);
					} else {
						if (res.not) {
							not.push(...res.not);
						}
					}
				} else {
					const res = target.match(el, scope, count + 1);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
				}
				if (matchedNodes.length > 0) {
					return {
						combinator: '+',
						specificity,
						matched: true,
						nodes: matchedNodes,
						has,
					};
				}
				return {
					combinator: '+',
					specificity,
					matched: false,
					not,
				};
			}
			// Subsequent-sibling combinator
			case '~': {
				const matchedNodes: (Element | Text)[] = [];
				const has: SelectorMatchedResult[] = [];
				const not: SelectorMatchedResult[] = [];
				let prev = el.previousElementSibling;
				let specificity: Specificity | undefined = undefined;
				while (prev) {
					const res = target.match(prev, scope, count + 1);
					if (!specificity) {
						specificity = [
							unitCheck.specificity[0] + res.specificity[0],
							unitCheck.specificity[1] + res.specificity[1],
							unitCheck.specificity[2] + res.specificity[2],
						];
					}
					if (res.matched) {
						matchedNodes.push(...res.nodes);
						has.push(...res.has);
					} else {
						if (res.not) {
							not.push(...res.not);
						}
					}
					prev = prev.previousElementSibling;
				}
				if (!specificity) {
					const res = target.match(el, scope, count + 1);
					specificity = [
						unitCheck.specificity[0] + res.specificity[0],
						unitCheck.specificity[1] + res.specificity[1],
						unitCheck.specificity[2] + res.specificity[2],
					];
				}
				if (matchedNodes.length > 0) {
					return {
						combinator: '~',
						specificity,
						matched: true,
						nodes: matchedNodes,
						has,
					};
				}
				return {
					combinator: '~',
					specificity,
					matched: false,
					not,
				};
			}
			// Column combinator
			case '||': {
				throw new Error(
					'Unsupported column combinator yet. If you want it, please request it as the issue (https://github.com/markuplint/markuplint/issues/new).',
				);
			}
			default: {
				throw new Error(`Unsupported ${this.#combinedFrom.combinator.value} combinator in selector`);
			}
		}
	}

	/**
	 * Matching is executed in this order: ID > tag name > classes > attributes > pseudo-elements.
	 * If any of the selectors are unmatched, the rest of the selectors is skipped for better performance.
	 *
	 * @param el
	 * @param scope
	 * @private
	 */
	private _matchWithoutCombineChecking(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		el: Node,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope: ParentNode | null,
	): SelectorResult {
		const specificity: Writable<Specificity> = [0, 0, 0];

		if (!isElement(el)) {
			return {
				specificity,
				matched: false,
			};
		}

		const has: SelectorMatchedResult[] = [];
		const not: SelectorMatchedResult[] = [];

		if (this.tag && this.tag._namespace) {
			const namespace: string = `${this.tag._namespace}`.toLowerCase();
			switch (namespace) {
				case '*':
				case 'true': {
					break;
				}
				case 'svg': {
					if (el.namespaceURI !== 'http://www.w3.org/2000/svg') {
						return {
							specificity,
							matched: false,
						};
					}
					break;
				}
				default: {
					throw new InvalidSelectorError(`The ${namespace} namespace is not supported`);
				}
			}
		}

		let matched = true;

		if (!this.#isAdded && !isScope(el, scope)) {
			matched = false;
		}

		if (matched && !this.id.every(id => id.value === el.id)) {
			matched = false;
		}
		specificity[0] += this.id.length;

		if (matched && this.tag && this.tag.type === 'tag') {
			specificity[2] += 1;

			let a = this.tag.value;
			let b = el.localName;

			if (isPureHTMLElement(el)) {
				a = a.toLowerCase();
				b = b.toLowerCase();
			}

			if (a !== b) {
				matched = false;
			}
		}

		if (matched && !this.class.every(className => el.classList.contains(className.value))) {
			matched = false;
		}
		specificity[1] += this.class.length;

		if (matched && !this.attr.every(attr => attrMatch(attr, el))) {
			matched = false;
		}
		specificity[1] += this.attr.length;

		if (matched) {
			for (const pseudo of this.pseudo) {
				const pseudoRes = pseudoMatch(pseudo, el, scope, this.#extended, this.depth);

				specificity[0] += pseudoRes.specificity[0];
				specificity[1] += pseudoRes.specificity[1];
				specificity[2] += pseudoRes.specificity[2];

				if (pseudoRes.matched) {
					has.push(...pseudoRes.has);
				} else {
					not.push(...(pseudoRes.not ?? []));
					matched = false;
				}
			}
		}

		if (matched) {
			return {
				specificity,
				matched,
				nodes: [el],
				has,
			};
		}

		return {
			specificity,
			matched,
			not,
		};
	}
}

function attrMatch(
	attr: ReadonlyDeep<parser.Attribute>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
) {
	return [...el.attributes].some(attrOfEl => {
		if (attr.attribute !== attrOfEl.localName) {
			return false;
		}
		if (attr.namespace != null && attr.namespace !== true && attr.namespace !== '*') {
			const ns = resolveNamespace(attrOfEl.localName, attrOfEl.namespaceURI);
			if (attr.namespace !== ns.namespace) {
				return false;
			}
		}
		if (attr.value != null) {
			let value = attr.value;
			let valueOfEl = attrOfEl.value;
			if (attr.insensitive) {
				value = value.toLowerCase();
				valueOfEl = valueOfEl.toLowerCase();
			}
			switch (attr.operator) {
				case '=': {
					if (value !== valueOfEl) {
						return false;
					}
					break;
				}
				case '~=': {
					if (!valueOfEl.split(/\s+/).includes(value)) {
						return false;
					}
					break;
				}
				case '|=': {
					if (!new RegExp(`^${value}(?:$|-)`).test(valueOfEl)) {
						return false;
					}
					break;
				}
				case '*=': {
					if (!valueOfEl.includes(value)) {
						return false;
					}
					break;
				}
				case '^=': {
					if (valueOfEl.indexOf(value) !== 0) {
						return false;
					}
					break;
				}
				case '$=': {
					if (valueOfEl.lastIndexOf(value) !== valueOfEl.length - value.length) {
						return false;
					}
					break;
				}
			}
		}
		return true;
	});
}

function pseudoMatch(
	pseudo: ReadonlyDeep<parser.Pseudo>,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	scope: ParentNode | null,
	extended: ExtendedPseudoClass,
	depth: number,
): SelectorResult {
	switch (pseudo.value) {
		//

		/**
		 * Below, markuplint Specific Selector
		 */
		case ':closest': {
			const ruleset = new Ruleset(pseudo.nodes, extended, depth + 1);
			const specificity = getSpecificity(ruleset.match(el, scope));
			let parent = el.parentElement;
			while (parent) {
				const matched = ruleset.match(parent, scope).filter((r): r is SelectorMatchedResult => r.matched);
				if (matched.length > 0) {
					return {
						specificity,
						matched: true,
						nodes: [el],
						has: matched,
					};
				}
				parent = parent.parentElement;
			}
			return {
				specificity,
				matched: false,
			};
		}

		/**
		 * Below, Selector Level 4
		 */
		case ':not': {
			const ruleset = new Ruleset(pseudo.nodes, extended, depth + 1);
			const resList = ruleset.match(el, scope);
			const specificity = getSpecificity(resList);
			const not = resList.filter((r): r is SelectorMatchedResult => r.matched);
			if (not.length === 0) {
				return {
					specificity,
					matched: true,
					nodes: [el],
					has: [],
				};
			}
			return {
				specificity,
				matched: false,
				not,
			};
		}
		case ':is': {
			const ruleset = new Ruleset(pseudo.nodes, extended, depth + 1);
			const resList = ruleset.match(el, scope);
			const specificity = getSpecificity(resList);
			const matched = resList.filter((r): r is SelectorMatchedResult => r.matched);
			return {
				specificity,
				matched: matched.length > 0,
				nodes: matched.flatMap(m => m.nodes),
				has: matched.flatMap(m => m.has),
			};
		}
		case ':has': {
			const ruleset = new Ruleset(pseudo.nodes, extended, depth + 1);
			const specificity = getSpecificity(ruleset.match(el, scope));
			switch (ruleset.headCombinator) {
				case '+':
				case '~': {
					const has = getSiblings(el).flatMap(sib =>
						ruleset.match(sib, el).filter((m): m is SelectorMatchedResult => m.matched),
					);
					if (has.length > 0) {
						return {
							specificity,
							matched: true,
							nodes: [el],
							has,
						};
					}
					return {
						specificity,
						matched: false,
					};
				}
				default: {
					const has = getDescendants(el).flatMap(sib =>
						ruleset.match(sib, el).filter((m): m is SelectorMatchedResult => m.matched),
					);
					if (has.length > 0) {
						return {
							specificity,
							matched: true,
							nodes: [el],
							has,
						};
					}
					return {
						specificity,
						matched: false,
					};
				}
			}
		}
		case ':where': {
			const ruleset = new Ruleset(pseudo.nodes, extended, depth + 1);
			const resList = ruleset.match(el, scope);
			const matched = resList.filter((r): r is SelectorMatchedResult => r.matched);
			return {
				specificity: [0, 0, 0],
				matched: matched.length > 0,
				nodes: matched.flatMap(m => m.nodes),
				has: matched.flatMap(m => m.has),
			};
		}
		case ':scope': {
			if (isScope(el, scope)) {
				return {
					specificity: [0, 1, 0],
					matched: true,
					nodes: [el],
					has: [],
				};
			}
			return {
				specificity: [0, 1, 0],
				matched: false,
			};
		}
		case ':root': {
			if (el.localName === 'html') {
				return {
					specificity: [0, 1, 0],
					matched: true,
					nodes: [el],
					has: [],
				};
			}
			return {
				specificity: [0, 1, 0],
				matched: false,
			};
		}
		case ':enable':
		case ':disable':
		case ':read-write':
		case ':read-only':
		case ':placeholder-shown':
		case ':default':
		case ':checked':
		case ':indeterminate':
		case ':valid':
		case ':invalid':
		case ':in-range':
		case ':out-of-range':
		case ':required':
		case ':optional':
		case ':blank':
		case ':user-invalid':
		case ':empty':
		case ':nth-child':
		case ':nth-last-child':
		case ':first-child':
		case ':last-child':
		case ':only-child':
		case ':nth-of-type':
		case ':nth-last-of-type':
		case ':first-of-type':
		case ':last-of-type':
		case ':only-of-type':
		case ':nth-last-col':
		case ':nth-col': {
			throw new Error(
				`Unsupported pseudo ${pseudo.toString()} selector yet. If you want it, please request it as the issue (https://github.com/markuplint/markuplint/issues/new).`,
			);
		}
		/* eslint-disable unicorn/no-useless-switch-case */
		case ':dir':
		case ':lang':
		case ':any-link':
		case ':link':
		case ':visited':
		case ':local-link':
		case ':target':
		case ':target-within':
		case ':current':
		case ':past':
		case ':future':
		case ':active':
		case ':hover':
		case ':focus':
		case ':focus-within':
		case ':focus-visible':
		case '::before':
		case '::after':
		default: {
			for (const ext of Object.keys(extended)) {
				if (pseudo.value !== `:${ext}`) {
					continue;
				}

				const content = pseudo.nodes.map(node => node.toString()).join('');
				const hook = extended[ext];
				if (!hook) {
					continue;
				}

				const matcher = hook(content);
				return matcher(el);
			}
			throw new Error(`Unsupported pseudo ${pseudo.toString()} selector.`);
		}
		/* eslint-enable unicorn/no-useless-switch-case */
	}
}

function isScope(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	scope: ParentNode | null,
) {
	return el === scope || el.parentNode === null;
}

function getDescendants(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
	includeSelf = false,
): Element[] {
	return [...[...el.children].flatMap(child => getDescendants(child, true)), ...(includeSelf ? [el] : [])];
}

function getSiblings(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element,
) {
	return [...(el.parentElement?.children ?? [])];
}

function getSpecificity(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	results: readonly SelectorResult[],
) {
	let specificity: Specificity | undefined;
	for (const result of results) {
		if (specificity) {
			const order = compareSpecificity(specificity, result.specificity);
			if (order === -1) {
				specificity = result.specificity;
			}
		} else {
			specificity = result.specificity;
		}
	}
	if (!specificity) {
		throw new Error('Result is empty');
	}
	return specificity;
}
