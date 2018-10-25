import { MLASTDocument, MLASTNode } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { MLRule } from '../';
import Ruleset from '../ruleset';
import { createNode } from './helper';
import { Comment, Element, ElementCloseTag, Node, Text } from './tokens';
import { AnonymousNode, NodeType } from './types';

/**
 * markuplint DOM Document
 */
export default class MLDOMDocument<T extends RuleConfigValue, O = null> {
	/**
	 * An array of markuplint DOM nodes
	 */
	public nodeList: AnonymousNode<T, O>[];

	/**
	 *
	 */
	public currentRule: MLRule<T, O> | null = null;

	/**
	 *
	 */
	public isFragment: boolean;

	/**
	 *
	 * @param ast node list of markuplint AST
	 * @param ruleset ruleset object
	 */
	constructor(ast: MLASTDocument, ruleset: Ruleset) {
		this.nodeList = ast.nodeList.map(astNode => createNode<MLASTNode, T, O>(astNode, this));
		this.isFragment = ast.isFragment;

		// add rules to node
		for (const node of this.nodeList) {
			// global rules
			for (const ruleName of Object.keys(ruleset.rules)) {
				const rule = ruleset.rules[ruleName];
				node.rules[ruleName] = rule;
			}

			if (!(node instanceof Element)) {
				continue;
			}

			// node specs and special rules for node by selector
			for (const nodeRule of ruleset.nodeRules) {
				const selector = nodeRule.selector || nodeRule.tagName;
				if (!selector) {
					continue;
				}

				const matched = node.matches(selector);

				if (!matched) {
					continue;
				}

				// specs
				node.categories = nodeRule.categories || [];
				node.roles = nodeRule.roles || [];
				node.obsolete = !!nodeRule.obsolete;

				if (!nodeRule.rules) {
					continue;
				}

				// special rules
				for (const ruleName of Object.keys(nodeRule.rules)) {
					const rule = nodeRule.rules[ruleName];
					if (rule) {
						node.rules[ruleName] = rule;
					}
				}
			}
		}

		// overwrite rule to child node
		for (const nodeRule of ruleset.childNodeRules) {
			if (!nodeRule.rules || !nodeRule.selector) {
				return;
			}
			for (const ruleName of Object.keys(nodeRule.rules)) {
				const rule = nodeRule.rules[ruleName];
				for (const node of this.nodeList) {
					if (!(node instanceof Element)) {
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

	public async walk(walker: Walker<T, O>) {
		for (const node of this.nodeList) {
			await walker(node);
		}
	}

	public async walkOn(type: 'Element', walker: Walker<T, O, Element<T, O>>): Promise<void>;
	public async walkOn(type: 'Text', walker: Walker<T, O, Text<T, O>>): Promise<void>;
	public async walkOn(type: 'Comment', walker: Walker<T, O, Comment<T, O>>): Promise<void>;
	public async walkOn(type: 'ElementCloseTag', walker: Walker<T, O, ElementCloseTag<T, O>>): Promise<void>;
	// tslint:disable-next-line:no-any
	public async walkOn(type: NodeType, walker: Walker<T, O, any>): Promise<void> {
		for (const node of this.nodeList) {
			if (node instanceof Node) {
				if (type === 'Node') {
					await walker(node);
				} else if (node.is(type)) {
					await walker(node);
				}
			}
		}
	}

	public setRule(rule: MLRule<T, O> | null) {
		this.currentRule = rule;
	}
}

export type Walker<T extends RuleConfigValue, O = null, N = AnonymousNode<T, O>> = (node: N) => Promise<void>;

export type SyncWalker<T extends RuleConfigValue, O = null, N = AnonymousNode<T, O>> = (node: N) => void;

function syncWalk<T extends RuleConfigValue, O = null>(nodeList: AnonymousNode<T, O>[], walker: SyncWalker<T, O>) {
	for (const node of nodeList) {
		walker(node);
	}
}
