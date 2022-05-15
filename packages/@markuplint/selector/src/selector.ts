import type { Specificity } from './types';

import parser, { pseudo } from 'postcss-selector-parser';

import { compareSpecificity } from './compare-specificity';
import { log as coreLog } from './debug';
import { InvalidSelectorError } from './invalid-selector-error';
import { isElement, isNonDocumentTypeChildNode, isPureHTMLElement } from './is';

const selLog = coreLog.extend('selector');
const resLog = coreLog.extend('result');

const caches = new Map<string, Selector>();

export function createSelector(selector: string) {
	let instance = caches.get(selector);
	if (instance) {
		return instance;
	}

	instance = new Selector(selector);
	caches.set(selector, instance);
	return instance;
}

type MultipleSelectorResult = SelectorResult[];

type SelectorResult = {
	specificity: Specificity;
	matched: boolean;
};

class Selector {
	#ruleset: Ruleset;

	constructor(selector: string) {
		this.#ruleset = Ruleset.parse(selector);
	}

	match(el: Node, scope: ParentNode | null = isElement(el) ? el : null): Specificity | false {
		const results = this.#ruleset.match(el, scope);
		for (const result of results) {
			if (result.matched) {
				return result.specificity;
			}
		}
		return false;
	}
}

class Ruleset {
	static parse(selector: string) {
		const selectors: parser.Selector[] = [];
		parser(root => {
			selectors.push(...root.nodes);
		}).processSync(selector);
		return new Ruleset(selectors, 0);
	}

	#selectorGroup: StructuredSelector[] = [];
	readonly headCombinator: string | null;

	constructor(selectors: parser.Selector[], depth: number) {
		this.#selectorGroup.push(...selectors.map(selector => new StructuredSelector(selector, depth)));
		const head = this.#selectorGroup[0];
		this.headCombinator = head?.headCombinator || null;

		if (this.headCombinator) {
			if (depth <= 0) {
				throw new InvalidSelectorError(`'${this.#selectorGroup[0].selector}' is not a valid selector`);
			}
		}
	}

	match(el: Node, scope: ParentNode | null): MultipleSelectorResult {
		coreLog(
			'<%s> (%s)',
			isElement(el) ? el.localName : el.nodeName,
			scope ? (isElement(scope) ? scope.localName : scope.nodeName) : null,
		);
		return this.#selectorGroup.map(selector => {
			selLog('"%s"', selector.selector);
			const res = selector.match(el, scope);
			resLog('%s "%s" => %o', isElement(el) ? el.localName : el.nodeName, selector.selector, res);
			return res;
		});
	}
}

class StructuredSelector {
	#selector: parser.Selector;
	#edge: SelectorTarget;
	readonly headCombinator: string | null;

	get selector() {
		return this.#selector.nodes.join('');
	}

	constructor(selector: parser.Selector, depth: number) {
		this.#selector = selector;
		this.#edge = new SelectorTarget(depth);
		this.headCombinator =
			this.#selector.nodes[0].type === 'combinator' ? this.#selector.nodes[0].value || null : null;
		if (0 < depth && this.headCombinator) {
			this.#selector.nodes.unshift(pseudo({ value: ':scope' }));
		}
		this.#selector.nodes.forEach(node => {
			switch (node.type) {
				case 'combinator': {
					const combinatedTarget = new SelectorTarget(depth);
					combinatedTarget.from(this.#edge, node);
					this.#edge = combinatedTarget;
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
		});
	}

	match(el: Node, scope: ParentNode | null): SelectorResult {
		return this.#edge.match(el, scope, 0);
	}
}

class SelectorTarget {
	#combinatedFrom: { target: SelectorTarget; combinator: parser.Combinator } | null = null;
	#isAdded = false;

	readonly depth: number;
	attr: parser.Attribute[] = [];
	class: parser.ClassName[] = [];
	id: parser.Identifier[] = [];
	pseudo: parser.Pseudo[] = [];
	tag: parser.Tag | parser.Universal | null = null;

	constructor(depth: number) {
		this.depth = depth;
	}

	add(
		selector:
			| parser.Tag
			| parser.Identifier
			| parser.ClassName
			| parser.Attribute
			| parser.Universal
			| parser.Pseudo,
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

	from(target: SelectorTarget, combinator: parser.Combinator) {
		this.#combinatedFrom = { target, combinator };
	}

	match(el: Node, scope: ParentNode | null, count: number): SelectorResult {
		const result = this._match(el, scope, count);
		if (selLog.enabled) {
			const nodeName = el.nodeName;
			const selector = this.#combinatedFrom?.target.toString() || this.toString();
			const combinator = result.combinator ? ` ${result.combinator}` : '';
			selLog('The %s element by "%s" => %s (%d)', nodeName, `${selector}${combinator}`, result.matched, count);
			if (selector === ':scope') {
				selLog(`† Scope is the ${scope?.nodeName || null}`);
			}
		}
		delete result.combinator;
		return result;
	}

	_match(el: Node, scope: ParentNode | null, count: number): SelectorResult & { combinator?: string } {
		const unitCheck = this._matchWithoutCombinateChecking(el, scope);
		if (!unitCheck.matched) {
			return unitCheck;
		}
		if (!this.#combinatedFrom) {
			return unitCheck;
		}
		if (!isNonDocumentTypeChildNode(el)) {
			return unitCheck;
		}
		const { target, combinator } = this.#combinatedFrom;
		switch (combinator.value) {
			// Descendant combinator
			case ' ': {
				let ancestor = el.parentElement;
				let matched = false;
				let specificity: Specificity | void;
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
						matched = true;
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
				return {
					combinator: '␣',
					specificity,
					matched,
				};
			}
			// Child combinator
			case '>': {
				let matched: boolean;
				const specificity = unitCheck.specificity;
				const parentNode = el.parentElement;

				if (parentNode) {
					const res = target.match(parentNode, scope, count + 1);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					matched = res.matched;
				} else {
					const res = target.match(el, scope, count + 1);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					matched = false;
				}
				return {
					combinator: '>',
					specificity,
					matched,
				};
			}
			// Next-sibling combinator
			case '+': {
				let matched: boolean;
				const specificity = unitCheck.specificity;

				if (el.previousElementSibling) {
					const res = target.match(el.previousElementSibling, scope, count + 1);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					matched = res.matched;
				} else {
					const res = target.match(el, scope, count + 1);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					matched = false;
				}
				return {
					combinator: '+',
					specificity,
					matched,
				};
			}
			// Subsequent-sibling combinator
			case '~': {
				let prev = el.previousElementSibling;
				let matched = false;
				let specificity: Specificity | void;
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
						matched = true;
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
				return {
					combinator: '~',
					specificity,
					matched,
				};
			}
			// Column combinator
			case '||': {
				throw new Error(
					'Unsupported column combinator yet. If you want it, please request it as the issue (https://github.com/markuplint/markuplint/issues/new).',
				);
			}
			default: {
				throw new Error(`Unsupported ${this.#combinatedFrom.combinator.value} combinator in selector`);
			}
		}
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

	_matchWithoutCombinateChecking(el: Node, scope: ParentNode | null): SelectorResult {
		const specificity: Specificity = [0, 0, 0];

		if (!isElement(el)) {
			return {
				specificity,
				matched: false,
			};
		}

		// @ts-ignore
		if (this.tag && this.tag._namespace) {
			// @ts-ignore
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

		if (!this.id.every(id => id.value === el.id)) {
			matched = false;
		}
		specificity[0] += this.id.length;

		if (!this.class.every(className => el.classList.contains(className.value))) {
			matched = false;
		}
		specificity[1] += this.class.length;

		if (!this.attr.every(attr => attrMatch(attr, el))) {
			matched = false;
		}
		specificity[1] += this.attr.length;

		for (const pseudo of this.pseudo) {
			const pseudoRes = pseudoMatch(pseudo, el, scope, this.depth);

			specificity[0] += pseudoRes.specificity[0];
			specificity[1] += pseudoRes.specificity[1];
			specificity[2] += pseudoRes.specificity[2];

			if (!pseudoRes.matched) {
				matched = false;
			}
		}

		if (this.tag && this.tag.type === 'tag') {
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

		return {
			specificity,
			matched,
		};
	}
}

function attrMatch(attr: parser.Attribute, el: Element) {
	return Array.from(el.attributes).some(attrOfEl => {
		if (attr.attribute !== attrOfEl.name) {
			return false;
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
					if (valueOfEl.indexOf(value) === -1) {
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

function pseudoMatch(pseudo: parser.Pseudo, el: Element, scope: ParentNode | null, depth: number): SelectorResult {
	switch (pseudo.value) {
		//

		/**
		 * Below, markuplint Specific Selector
		 */
		case ':closest': {
			const ruleset = new Ruleset(pseudo.nodes, depth + 1);
			const specificity = getSpecificity(ruleset.match(el, scope));
			let parent = el.parentElement;
			while (parent) {
				if (ruleset.match(parent, scope).some(r => r.matched)) {
					return {
						specificity,
						matched: true,
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
			const ruleset = new Ruleset(pseudo.nodes, depth + 1);
			const resList = ruleset.match(el, scope);
			const specificity = getSpecificity(resList);
			const matched = resList.every(r => !r.matched);
			return {
				specificity,
				matched,
			};
		}
		case ':is': {
			const ruleset = new Ruleset(pseudo.nodes, depth + 1);
			const resList = ruleset.match(el, scope);
			const specificity = getSpecificity(resList);
			const matched = resList.some(r => r.matched);
			return {
				specificity,
				matched,
			};
		}
		case ':has': {
			const ruleset = new Ruleset(pseudo.nodes, depth + 1);
			const specificity = getSpecificity(ruleset.match(el, scope));
			switch (ruleset.headCombinator) {
				case '+':
				case '~': {
					const matched = getSiblings(el).some(sib => ruleset.match(sib, el).some(m => m.matched));
					return {
						specificity,
						matched,
					};
				}
				default: {
					const matched = getDescendants(el).some(desc => ruleset.match(desc, el).some(m => m.matched));
					return {
						specificity,
						matched,
					};
				}
			}
		}
		case ':where': {
			const ruleset = new Ruleset(pseudo.nodes, depth + 1);
			const resList = ruleset.match(el, scope);
			const matched = resList.some(r => r.matched);
			return {
				specificity: [0, 0, 0],
				matched,
			};
		}
		case ':scope': {
			if (isScope(el, scope)) {
				return {
					specificity: [0, 1, 0],
					matched: true,
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
			throw new Error(`Unsupported pseudo ${pseudo.toString()} selector.`);
		}
	}
}

function isScope(el: Element, scope: ParentNode | null) {
	return el === scope || el.parentNode === null;
}

function getDescendants(el: Element, includeSelf = false): Element[] {
	return [
		...Array.from(el.children)
			.map(child => getDescendants(child, true))
			.flat(),
		...(includeSelf ? [el] : []),
	];
}

function getSiblings(el: Element) {
	return Array.from(el.parentElement?.children || []);
}

function getSpecificity(result: MultipleSelectorResult) {
	let specificity: Specificity | void;
	for (const res of result) {
		if (specificity) {
			const order = compareSpecificity(specificity, res.specificity);
			if (order === -1) {
				specificity = res.specificity;
			}
		} else {
			specificity = res.specificity;
		}
	}
	if (!specificity) {
		throw new Error('Result is empty');
	}
	return specificity;
}
