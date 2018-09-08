import { MLASTNode } from '@markuplint/ml-ast';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';
import { MLRule } from '../';
import Ruleset from '../ruleset';
import { createNode } from './helper';
import { Comment, Element, ElementCloseTag, Node, Text } from './tokens';
import { AnonymousNode, NodeType } from './types';

/**
 * markuplint DOM Document
 */
export default class MLDOMDocument<T extends RuleConfigValue, O extends RuleConfigOptions> {
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
	 * @param astNodeList node list of markuplint AST
	 * @param ruleset ruleset object
	 */
	constructor(astNodeList: MLASTNode[], ruleset: Ruleset) {
		this.nodeList = astNodeList.map(astNode => createNode<MLASTNode, T, O>(astNode, this));

		for (const node of this.nodeList) {
			ruleset.eachRules((ruleName, rule) => {
				node.rules[ruleName] = rule;
			});

			if (!(node instanceof Element)) {
				continue;
			}

			ruleset.eachNodeRules((selector, ruleName, rule) => {
				if (node.matches(selector)) {
					node.rules[ruleName] = rule;
				}
			});

			// childNodeRules
			ruleset.eachChildNodeRules((selector, ruleName, rule, inheritance) => {
				if (node.matches(selector)) {
					if (inheritance) {
						syncWalk(node.childNodes, childNode => {
							childNode.rules[ruleName] = rule;
						});
					} else {
						for (const childNode of node.childNodes) {
							childNode.rules[ruleName] = rule;
						}
					}
				}
			});
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

export type Walker<T extends RuleConfigValue, O extends RuleConfigOptions, N = AnonymousNode<T, O>> = (
	node: N,
) => Promise<void>;

export type SyncWalker<T extends RuleConfigValue, O extends RuleConfigOptions, N = AnonymousNode<T, O>> = (
	node: N,
) => void;

function syncWalk<T extends RuleConfigValue, O extends RuleConfigOptions>(
	nodeList: AnonymousNode<T, O>[],
	walker: SyncWalker<T, O>,
) {
	for (const node of nodeList) {
		walker(node);
	}
}
