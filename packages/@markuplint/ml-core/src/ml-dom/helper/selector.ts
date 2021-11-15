import type MLDOMAbstractElement from '../tokens/abstract-element';

import parser from 'postcss-selector-parser';

export function createSelector(selector: string) {
	return new Selector(selector);
}

type TargetElement = MLDOMAbstractElement<any, any>;

class Selector {
	#ruleset: Ruleset;

	constructor(selector: string) {
		this.#ruleset = Ruleset.parse(selector);
	}

	match(el: TargetElement, caller: TargetElement | null = el) {
		return this.#ruleset.match(el, caller);
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

	match(el: TargetElement, caller: TargetElement | null) {
		return this.#selectorGroup.some(selector => selector.match(el, caller));
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

	match(el: TargetElement, caller: TargetElement | null) {
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

	match(el: TargetElement, caller: TargetElement | null): boolean {
		const matched = this._matchWithoutCombinateChecking(el, caller);
		if (!matched) {
			return false;
		}
		if (!this.#combinatedFrom) {
			return true;
		}
		const { target, combinator } = this.#combinatedFrom;
		switch (combinator.value) {
			// Descendant combinator
			case ' ': {
				let ancestor = el.parentNode;
				while (ancestor) {
					const ancestorMatched = target._matchWithoutCombinateChecking(ancestor, caller);
					if (ancestorMatched) {
						return target.match(ancestor, caller);
					}
					ancestor = ancestor.parentNode;
				}
				return false;
			}
			// Child combinator
			case '>': {
				if (!el.parentNode) {
					return false;
				}
				const parentMatched = target._matchWithoutCombinateChecking(el.parentNode, caller);
				if (parentMatched) {
					return target.match(el.parentNode, caller);
				}
				return false;
			}
			// Next-sibling combinator
			case '+': {
				if (!el.previousElementSibling) {
					return false;
				}
				const prevMatched = target._matchWithoutCombinateChecking(el.previousElementSibling, caller);
				if (prevMatched) {
					return target.match(el.previousElementSibling, caller);
				}
				return false;
			}
			// Subsequent-sibling combinator
			case '~': {
				let prev = el.previousElementSibling;
				while (prev) {
					const prevMatched = target._matchWithoutCombinateChecking(prev, caller);
					if (prevMatched) {
						return target.match(prev, caller);
					}
					prev = prev.previousElementSibling;
				}
				return false;
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

	_matchWithoutCombinateChecking(el: TargetElement, caller: TargetElement | null) {
		if (!this.#isAdded) {
			return isScope(el, caller);
		}

		if (this.tag && this.tag.type === 'tag') {
			if (this.tag.value.toLowerCase() !== el.nodeName.toLowerCase()) {
				return false;
			}
		}

		if (!this.id.every(id => id.value === el.id)) {
			return false;
		}

		if (!this.class.every(className => el.classList.includes(className.value))) {
			return false;
		}

		if (!this.attr.every(attr => attrMatch(attr, el))) {
			return false;
		}

		if (!this.pseudo.every(pseudo => pseudoMatch(pseudo, el, caller))) {
			return false;
		}

		return true;
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

function pseudoMatch(pseudo: parser.Pseudo, el: TargetElement, caller: TargetElement | null) {
	switch (pseudo.value) {
		/**
		 * Below, markuplint Specific Selector
		 */
		case ':closest': {
			const ruleset = new Ruleset(pseudo.nodes);
			let parent = el.parentNode;
			while (parent) {
				if (ruleset.match(parent, caller)) {
					return true;
				}
				parent = parent.parentNode;
			}
			return false;
		}

		/**
		 * Below, Selector Level 4
		 */
		case ':not': {
			const ruleset = new Ruleset(pseudo.nodes);
			if (ruleset.match(el, caller)) {
				return false;
			}
			break;
		}
		case ':is': {
			const ruleset = new Ruleset(pseudo.nodes);
			if (!ruleset.match(el, caller)) {
				return false;
			}
			break;
		}
		case ':has': {
			const ruleset = new Ruleset(pseudo.nodes);
			const descendants = getDescendants(el);
			if (!descendants.some(desc => ruleset.match(desc, caller))) {
				return false;
			}
			break;
		}
		case ':scope': {
			if (!isScope(el, caller)) {
				return false;
			}
			break;
		}
		case ':root': {
			if (!(!el.isInFragmentDocument && el.parentNode === null)) {
				return false;
			}
			break;
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
		case ':where':
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

	return true;
}

function isScope(el: TargetElement, caller: TargetElement | null) {
	return el.uuid === caller?.uuid || (!el.isInFragmentDocument && el.parentNode === null);
}

function getDescendants(el: TargetElement, includeSelf = false): TargetElement[] {
	return [...el.children.map(child => getDescendants(child, true)).flat(), ...(includeSelf ? [el] : [])];
}
