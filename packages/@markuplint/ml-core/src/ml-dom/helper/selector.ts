import type MLDOMAbstractElement from '../tokens/abstract-element';

import parser from 'postcss-selector-parser';

import { log as coreLog } from '../../debug';

const log = coreLog.extend('selector');
const resLog = log.extend('result');

export type Specificity = [number, number, number];

export function createSelector(selector: string) {
	return new Selector(selector);
}

export function compareSpecificity(a: Specificity, b: Specificity) {
	if (a[0] < b[0]) {
		return -1;
	} else if (a[0] > b[0]) {
		return 1;
	} else if (a[1] < b[1]) {
		return -1;
	} else if (a[1] > b[1]) {
		return 1;
	} else if (a[2] < b[2]) {
		return -1;
	} else if (a[2] > b[2]) {
		return 1;
	}
	return 0;
}

type TargetElement = MLDOMAbstractElement<any, any>;

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

	match(el: TargetElement, caller: TargetElement | null = el): Specificity | false {
		const results = this.#ruleset.match(el, caller);
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
		return new Ruleset(selectors);
	}

	#selectorGroup: StructuredSelector[] = [];

	constructor(selectors: parser.Selector[]) {
		this.#selectorGroup.push(...selectors.map(selector => new StructuredSelector(selector)));
	}

	match(el: TargetElement, caller: TargetElement | null): MultipleSelectorResult {
		log('%s', el.raw);
		return this.#selectorGroup.map(selector => {
			const res = selector.match(el, caller);
			resLog('%s => %o', selector.selector, res);
			return res;
		});
	}
}

class StructuredSelector {
	#edge: SelectorTarget;
	#selector: parser.Selector;

	constructor(selector: parser.Selector) {
		this.#selector = selector;

		this.#edge = new SelectorTarget();
		this.#selector.nodes.forEach(node => {
			switch (node.type) {
				case 'combinator': {
					const combinatedTarget = new SelectorTarget();
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

	get selector() {
		return this.#selector.nodes.join('');
	}

	match(el: TargetElement, caller: TargetElement | null): SelectorResult {
		return this.#edge.match(el, caller);
	}
}

class SelectorTarget {
	tag: parser.Tag | parser.Universal | null = null;
	id: parser.Identifier[] = [];
	class: parser.ClassName[] = [];
	attr: parser.Attribute[] = [];
	pseudo: parser.Pseudo[] = [];
	#isAdded = false;
	#combinatedFrom: { target: SelectorTarget; combinator: parser.Combinator } | null = null;

	match(el: TargetElement, caller: TargetElement | null): SelectorResult {
		const unitCheck = this._matchWithoutCombinateChecking(el, caller);
		if (!unitCheck.matched) {
			return unitCheck;
		}
		if (!this.#combinatedFrom) {
			return unitCheck;
		}
		const { target, combinator } = this.#combinatedFrom;
		switch (combinator.value) {
			// Descendant combinator
			case ' ': {
				let ancestor = el.parentNode;
				let matched = false;
				let specificity: Specificity | void;
				while (ancestor) {
					const res = target.match(ancestor, caller);
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
					ancestor = ancestor.parentNode;
				}
				if (!specificity) {
					const res = target.match(el, caller);
					specificity = [
						unitCheck.specificity[0] + res.specificity[0],
						unitCheck.specificity[1] + res.specificity[1],
						unitCheck.specificity[2] + res.specificity[2],
					];
				}
				return {
					specificity,
					matched,
				};
			}
			// Child combinator
			case '>': {
				let matched: boolean;
				const specificity = unitCheck.specificity;

				if (el.parentNode) {
					const res = target.match(el.parentNode, caller);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					matched = res.matched;
				} else {
					const res = target.match(el, caller);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					matched = false;
				}
				return {
					specificity,
					matched,
				};
			}
			// Next-sibling combinator
			case '+': {
				let matched: boolean;
				const specificity = unitCheck.specificity;

				if (el.previousElementSibling) {
					const res = target.match(el.previousElementSibling, caller);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					matched = res.matched;
				} else {
					const res = target.match(el, caller);
					specificity[0] += res.specificity[0];
					specificity[1] += res.specificity[1];
					specificity[2] += res.specificity[2];
					matched = false;
				}
				return {
					specificity,
					matched,
				};
			}
			// // Subsequent-sibling combinator
			case '~': {
				let prev = el.previousElementSibling;
				let matched = false;
				let specificity: Specificity | void;
				while (prev) {
					const res = target.match(prev, caller);
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
					const res = target.match(el, caller);
					specificity = [
						unitCheck.specificity[0] + res.specificity[0],
						unitCheck.specificity[1] + res.specificity[1],
						unitCheck.specificity[2] + res.specificity[2],
					];
				}
				return {
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

	_matchWithoutCombinateChecking(el: TargetElement, caller: TargetElement | null): SelectorResult {
		const specificity: Specificity = [0, 0, 0];

		let matched = true;

		if (!this.#isAdded && !isScope(el, caller)) {
			matched = false;
		}

		if (!this.id.every(id => id.value === el.id)) {
			matched = false;
		}
		specificity[0] += this.id.length;

		if (!this.class.every(className => el.classList.includes(className.value))) {
			matched = false;
		}
		specificity[1] += this.class.length;

		if (!this.attr.every(attr => attrMatch(attr, el))) {
			matched = false;
		}
		specificity[1] += this.attr.length;

		for (const pseudo of this.pseudo) {
			const pseudoRes = pseudoMatch(pseudo, el, caller);

			specificity[0] += pseudoRes.specificity[0];
			specificity[1] += pseudoRes.specificity[1];
			specificity[2] += pseudoRes.specificity[2];

			if (!pseudoRes.matched) {
				matched = false;
			}
		}

		if (this.tag && this.tag.type === 'tag') {
			specificity[2] += 1;

			if (this.tag.value.toLowerCase() !== el.nodeName.toLowerCase()) {
				matched = false;
			}
		}

		return {
			specificity,
			matched,
		};
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
}

function attrMatch(attr: parser.Attribute, el: TargetElement) {
	return el.attributes.some(attrOfEl => {
		if (attr.attribute !== attrOfEl.getName().potential) {
			return false;
		}
		if (attr.value != null) {
			let value = attr.value;
			let valueOfEl = attrOfEl.getValue().potential;
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

function pseudoMatch(pseudo: parser.Pseudo, el: TargetElement, caller: TargetElement | null): SelectorResult {
	switch (pseudo.value) {
		/**
		 * Below, markuplint Specific Selector
		 */
		case ':closest': {
			const ruleset = new Ruleset(pseudo.nodes);
			const specificity = getSpecificity(ruleset.match(el, caller));
			let parent = el.parentNode;
			while (parent) {
				if (ruleset.match(parent, caller).some(r => r.matched)) {
					return {
						specificity,
						matched: true,
					};
				}
				parent = parent.parentNode;
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
			const ruleset = new Ruleset(pseudo.nodes);
			const resList = ruleset.match(el, caller);
			const specificity = getSpecificity(resList);
			const matched = resList.every(r => !r.matched);
			return {
				specificity,
				matched,
			};
		}
		case ':is': {
			const ruleset = new Ruleset(pseudo.nodes);
			const resList = ruleset.match(el, caller);
			const specificity = getSpecificity(resList);
			const matched = resList.some(r => r.matched);
			return {
				specificity,
				matched,
			};
		}
		case ':has': {
			const ruleset = new Ruleset(pseudo.nodes);
			const specificity = getSpecificity(ruleset.match(el, caller));
			const descendants = getDescendants(el);
			const matched = descendants.some(desc => ruleset.match(desc, caller).some(m => m.matched));
			return {
				specificity,
				matched,
			};
		}
		case ':where': {
			const ruleset = new Ruleset(pseudo.nodes);
			const resList = ruleset.match(el, caller);
			const matched = resList.some(r => r.matched);
			return {
				specificity: [0, 0, 0],
				matched,
			};
		}
		case ':scope': {
			if (!isScope(el, caller)) {
				return {
					specificity: [0, 1, 0],
					matched: false,
				};
			}
			return {
				specificity: [0, 1, 0],
				matched: true,
			};
		}
		case ':root': {
			if (!(!el.isInFragmentDocument && el.parentNode === null)) {
				return {
					specificity: [0, 1, 0],
					matched: false,
				};
			}
			return {
				specificity: [0, 1, 0],
				matched: true,
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

function isScope(el: TargetElement, caller: TargetElement | null) {
	return el.uuid === caller?.uuid || (!el.isInFragmentDocument && el.parentNode === null);
}

function getDescendants(el: TargetElement, includeSelf = false): TargetElement[] {
	return [...el.children.map(child => getDescendants(child, true)).flat(), ...(includeSelf ? [el] : [])];
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
