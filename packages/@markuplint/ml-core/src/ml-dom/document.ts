import { AnonymousNode, NodeType } from './types';
import { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';
import { MLASTDocument, MLASTNode, MLASTNodeType } from '@markuplint/ml-ast';
import { MLDOMComment, MLDOMDoctype, MLDOMElement, MLDOMElementCloseTag, MLDOMNode, MLDOMText } from './tokens';
import { NodeStore, createNode } from './helper';
import { Walker, syncWalk } from './helper/walkers';
import { MLRule } from '../';
import { RuleConfigValue } from '@markuplint/ml-config';
import Ruleset from '../ruleset';

/**
 * markuplint DOM Document
 */
export default class MLDOMDocument<T extends RuleConfigValue, O = null> {
	/**
	 * An array of markuplint DOM nodes
	 */
	nodeList: ReadonlyArray<AnonymousNode<T, O>>;

	/**
	 *
	 */
	currentRule: MLRule<T, O> | null = null;

	/**
	 *
	 */
	isFragment: boolean;

	/**
	 *
	 */
	schemas: Readonly<[MLMLSpec, ...ExtendedSpec[]]>;

	/**
	 *
	 */
	readonly nodeStore = new NodeStore();

	/**
	 *
	 * @param ast node list of markuplint AST
	 * @param ruleset ruleset object
	 */
	constructor(ast: MLASTDocument, ruleset: Ruleset, schemas: readonly [MLMLSpec, ...ExtendedSpec[]]) {
		// console.log(ast.nodeList.map((n, i) => `${i}: ${n.uuid} "${n.raw.trim()}"(${n.type})`));
		this.nodeList = Object.freeze(
			ast.nodeList.map(astNode => {
				if (astNode.type === MLASTNodeType.EndTag) {
					return this.nodeStore.getNode(astNode);
				}
				return createNode<MLASTNode, T, O>(astNode, this);
			}),
		);
		this.isFragment = ast.isFragment;

		this.schemas = schemas;

		this._init(ruleset);
	}

	get doctype() {
		for (const node of this.nodeList) {
			if (node instanceof MLDOMDoctype) {
				return node;
			}
		}
		return null;
	}

	get tree() {
		const treeRoots: AnonymousNode<T, O>[] = [];
		let traversalNode: AnonymousNode<T, O> | null = this.nodeList[0];
		while (traversalNode) {
			treeRoots.push(traversalNode);
			traversalNode = traversalNode.nextNode;
		}
		return treeRoots;
	}

	walk(walker: Walker<T, O>): void | Promise<void[]> {
		// sync API won't rely on the result
		return Promise.all(this.nodeList.map(walker));
	}

	/**
	 *
	 * @param type
	 * @param walker
	 * @param skipWhenRuleIsDisabled
	 */
	walkOn(
		type: 'Element',
		walker: Walker<T, O, MLDOMElement<T, O>>,
		skipWhenRuleIsDisabled?: boolean,
	): void | Promise<void[]>;
	walkOn(
		type: 'Text',
		walker: Walker<T, O, MLDOMText<T, O>>,
		skipWhenRuleIsDisabled?: boolean,
	): void | Promise<void[]>;
	walkOn(
		type: 'Comment',
		walker: Walker<T, O, MLDOMComment<T, O>>,
		skipWhenRuleIsDisabled?: boolean,
	): void | Promise<void[]>;
	walkOn(
		type: 'ElementCloseTag',
		walker: Walker<T, O, MLDOMElementCloseTag<T, O>>,
		skipWhenRuleIsDisabled?: boolean,
	): void | Promise<void[]>;
	walkOn(type: NodeType, walker: Walker<T, O, any>, skipWhenRuleIsDisabled: boolean = true): void | Promise<void[]> {
		// sync API won't rely on the result
		return Promise.all(
			this.nodeList.map(node => {
				if (node instanceof MLDOMNode) {
					if (skipWhenRuleIsDisabled && node.rule.disabled) {
						return;
					}
					if (node.is(type)) {
						return walker(node);
					}
				}
			}),
		);
	}

	setRule(rule: MLRule<T, O> | null) {
		this.currentRule = rule;
	}

	matchNodes(query: string): MLDOMElement<T, O>[] {
		return this.nodeList.filter(
			(node: AnonymousNode<T, O>): node is MLDOMElement<T, O> => node.type === 'Element' && node.matches(query),
		);
	}

	toString() {
		const html: string[] = [];
		for (const node of this.nodeList) {
			html.push(node.raw);
		}
		return html.join('');
	}

	private _init(ruleset: Ruleset) {
		// add rules to node
		for (const node of this.nodeList) {
			// global rules
			for (const ruleName of Object.keys(ruleset.rules)) {
				const rule = ruleset.rules[ruleName];
				node.rules[ruleName] = rule;
			}

			if (node.type !== 'Element' && node.type !== 'ElementCloseTag') {
				continue;
			}

			const selectorTarget = node.type === 'Element' ? node : node.startTag;

			// node specs and special rules for node by selector
			for (const nodeRule of ruleset.nodeRules) {
				if (!nodeRule.rules) {
					continue;
				}

				const selector = nodeRule.selector || nodeRule.tagName;
				if (!selector) {
					continue;
				}

				const matched = selectorTarget.matches(selector);

				if (!matched) {
					continue;
				}

				// special rules
				for (const ruleName of Object.keys(nodeRule.rules)) {
					const rule = nodeRule.rules[ruleName];
					node.rules[ruleName] = rule;
				}
			}
		}

		// overwrite rule to child node
		for (const nodeRule of ruleset.childNodeRules) {
			if (!nodeRule.rules || !nodeRule.selector) {
				break;
			}
			for (const ruleName of Object.keys(nodeRule.rules)) {
				const rule = nodeRule.rules[ruleName];
				for (const node of this.nodeList) {
					if (node.type !== 'Element') {
						continue;
					}
					if (node.matches(nodeRule.selector)) {
						if (nodeRule.inheritance) {
							syncWalk(node.childNodes, childNode => {
								childNode.rules[ruleName] = rule;
							});
						} else {
							for (const childNode of node.childNodes) {
								childNode.rules[ruleName] = rule;
							}
						}
					}
				}
			}
		}
	}
}
