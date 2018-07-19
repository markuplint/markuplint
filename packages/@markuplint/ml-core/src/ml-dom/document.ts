import CustomRule from '@markuplint/custom-rule';
import { MLASTNode } from '@markuplint/ml-ast/';
import { RuleConfigOptions, RuleConfigValue } from '@markuplint/ml-config';
import Ruleset from '../ruleset/core';

import createNode from './helper/create-node';
import Comment from './tokens/comment';
import Doctype from './tokens/doctype';
import Element from './tokens/element';
import ElementCloseTag from './tokens/element-close-tag';
import InvalidNode from './tokens/invalid-node';
import Node from './tokens/node';
import OmittedElement from './tokens/omitted-element';
import Text from './tokens/text';

export type AnonymousNode<T, O> =
	| Doctype<T, O>
	| Element<T, O>
	| ElementCloseTag<T, O>
	| OmittedElement<T, O>
	| Comment<T, O>
	| Text<T, O>
	| InvalidNode<T, O>
	| Node<T, O>;

/**
 * markuplint DOM Document
 */
export default class MLDOMDocument<T extends RuleConfigValue = null, O extends RuleConfigOptions = {}> {
	/**
	 * An array of markuplint DOM nodes
	 */
	public nodeList: AnonymousNode<T, O>[];

	/**
	 *
	 */
	public currentRule: CustomRule<T, O> | null = null;

	/**
	 *
	 * @param astNodeList node list of markuplint AST
	 * @param ruleset ruleset object
	 */
	constructor(astNodeList: MLASTNode[], ruleset: Ruleset) {
		this.nodeList = astNodeList.map(astNode => createNode<MLASTNode, T, O>(astNode));

		// for (const node of this.nodeList) {
		// 	for (const ruleName in ruleset.rules) {
		// 		if (ruleset.rules.hasOwnProperty(ruleName)) {
		// 			const rule = ruleset.rules[ruleName];
		// 			node.rules[ruleName] = rule;
		// 		}
		// 	}
		// 	for (const nodeRule of ruleset.nodeRules) {
		// 		if (nodeRule.rules) {
		// 			for (const ruleName in nodeRule.rules) {
		// 				if (nodeRule.rules.hasOwnProperty(ruleName)) {
		// 					const rule = nodeRule.rules[ruleName];
		// 					if (nodeRule.tagName || nodeRule.selector) {
		// 						if (nodeRule.tagName === node.nodeName) {
		// 							node.rules[ruleName] = rule;
		// 						} else if (nodeRule.selector && node instanceof Element) {
		// 							if (node.matches(nodeRule.selector)) {
		// 								node.rules[ruleName] = rule;
		// 							}
		// 						}
		// 					}
		// 				}
		// 			}
		// 		}
		// 		if (node instanceof Element) {
		// 			if (node.nodeName.toLowerCase() === nodeRule.tagName) {
		// 				node.obsolete = !!nodeRule.obsolete;
		// 			}
		// 		}
		// 	}
		// }

		// // childNodeRules
		// const stackNodes: [
		// 	(Element<T, O> | OmittedElement<T, O>),
		// 	string,
		// 	boolean | ConfigureFileJSONRuleOption<null, {}>,
		// 	boolean
		// ][] = [];

		// for (const node of this.nodeList) {
		// 	if (node instanceof Element || node instanceof OmittedElement) {
		// 		for (const nodeRule of _ruleset.childNodeRules) {
		// 			if (nodeRule.rules) {
		// 				for (const ruleName in nodeRule.rules) {
		// 					if (nodeRule.rules.hasOwnProperty(ruleName)) {
		// 						const rule = nodeRule.rules[ruleName];
		// 						if (nodeRule.tagName || nodeRule.selector) {
		// 							if (nodeRule.tagName === node.nodeName) {
		// 								stackNodes.push([node, ruleName, rule, !!nodeRule.inheritance]);
		// 							} else if (nodeRule.selector && node instanceof Element) {
		// 								if (node.matches(nodeRule.selector)) {
		// 									stackNodes.push([node, ruleName, rule, !!nodeRule.inheritance]);
		// 								}
		// 							}
		// 						}
		// 					}
		// 				}
		// 			}
		// 		}
		// 	}
		// }

		// for (const stackNode of stackNodes) {
		// 	const node = stackNode[0];
		// 	const ruleName = stackNode[1];
		// 	const rule = stackNode[2];
		// 	const inheritance = stackNode[3];
		// 	if (inheritance) {
		// 		syncWalk(node.childNodes, childNode => {
		// 			childNode.rules[ruleName] = rule;
		// 		});
		// 	} else {
		// 		for (const childNode of node.childNodes) {
		// 			childNode.rules[ruleName] = rule;
		// 		}
		// 	}
		// }
	}

	public setRule(rule: CustomRule<T, O> | null) {
		this.currentRule = rule;
	}
}
